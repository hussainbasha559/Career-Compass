"""
auth.py  -  Login / Register / JWT for Career Compass
Install:  pip install pyjwt
"""
import os
import time
import hmac
import sqlite3
import hashlib
import secrets
from contextlib import contextmanager

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

SECRET = os.getenv("JWT_SECRET", "change-this-secret-before-deploying")
DB_PATH = os.getenv("DB_PATH", "career.db")
TOKEN_DAYS = 7

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


# ---------- database ----------

@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                stage TEXT DEFAULT 'Not set',
                interest TEXT DEFAULT 'Not sure',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


# ---------- password + token helpers ----------

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 200_000
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$")
    except ValueError:
        return False
    check = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 200_000
    ).hex()
    return hmac.compare_digest(check, digest)


def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": int(time.time()) + TOKEN_DAYS * 24 * 3600,
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def public_user(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "stage": row["stage"],
        "interest": row["interest"],
    }


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    """Use as a dependency on any route that needs a logged-in user."""
    if not creds:
        raise HTTPException(status_code=401, detail="Please log in")
    try:
        payload = jwt.decode(creds.credentials, SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Session expired, log in again")

    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    return dict(row)


# ---------- routes ----------

class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    stage: str = "Not set"
    interest: str = "Not sure"


class LoginIn(BaseModel):
    email: str
    password: str


class ProfileIn(BaseModel):
    stage: str
    interest: str


@router.post("/register")
def register(data: RegisterIn):
    name = data.name.strip()
    email = data.email.strip().lower()

    if not name:
        raise HTTPException(400, "Name is required")
    if "@" not in email:
        raise HTTPException(400, "Enter a valid email")
    if len(data.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    with get_conn() as conn:
        exists = conn.execute(
            "SELECT id FROM users WHERE email = ?", (email,)
        ).fetchone()
        if exists:
            raise HTTPException(400, "This email is already registered")

        cur = conn.execute(
            "INSERT INTO users (name, email, password_hash, stage, interest) "
            "VALUES (?, ?, ?, ?, ?)",
            (name, email, hash_password(data.password), data.stage, data.interest),
        )
        user_id = cur.lastrowid
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    return {"token": create_token(user_id), "user": public_user(row)}


@router.post("/login")
def login(data: LoginIn):
    email = data.email.strip().lower()
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email,)
        ).fetchone()

    if not row or not verify_password(data.password, row["password_hash"]):
        raise HTTPException(401, "Wrong email or password")

    return {"token": create_token(row["id"]), "user": public_user(row)}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


@router.put("/profile")
def update_profile(data: ProfileIn, user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET stage = ?, interest = ? WHERE id = ?",
            (data.stage, data.interest, user["id"]),
        )
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    return {"user": public_user(row)}