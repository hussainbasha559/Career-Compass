"""
chat.py  -  AI career chatbot + guidance roadmap (Ollama / Llama 3)
"""
import json
from typing import Optional

import ollama
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from Auth import get_conn, get_current_user

router = APIRouter(tags=["ai"])

MODEL = "llama3"

# main.py sets this to the same dict it uses, so the chatbot sees live scores:
#   import chat as chat_module
#   chat_module.skill_scores = skill_scores
skill_scores: dict = {}


# ---------- prompts ----------

INDIA_CONTEXT = """
Indian education context you can use:
- After 10th: Intermediate (MPC, BiPC, MEC, CEC), Polytechnic diploma (POLYCET), ITI, vocational courses, short skill courses.
- After Intermediate: B.Tech (EAPCET/EAMCET, JEE), MBBS/BDS/Pharmacy/Nursing/Agriculture (NEET), Degree (B.Sc, B.Com, BBA, BA), Law (CLAT/LAWCET), Design, Hotel Management, Defence (NDA), CA/CMA/CS.
- After Degree: PG (MBA via CAT/ICET, MCA via ICET, M.Sc), government exams (Groups, UPSC, Banking, SSC, Railways, Teaching), IT jobs with upskilling.
- After B.Tech: campus placements, off-campus jobs, GATE/M.Tech, MS abroad, MBA, government/PSU jobs, startups.
- IT careers: web dev, data, AI/ML, cloud, cybersecurity, testing, UI/UX. Non-IT careers: government jobs, banking, teaching, healthcare, finance/accounting, law, design, media, hospitality, business.
"""


def system_prompt(user: dict, page: Optional[str]) -> str:
    scores = ", ".join(f"{k}: {v}%" for k, v in skill_scores.items()) or "not assessed yet"
    return f"""You are "Career Compass AI", a friendly and honest career guidance counsellor for students in India.
You help students after 10th, Intermediate, Degree and B.Tech, for both IT and Non-IT careers.

Student profile:
- Name: {user.get('name')}
- Current stage: {user.get('stage')}
- Interest: {user.get('interest')}
- Skill scores (IT): {scores}
- Student is currently on the "{page or 'website'}" page.

Rules:
- Reply in the same language the student uses: Telugu, English, or Tanglish (Telugu written in English letters).
- Keep answers short, practical and step by step. Use small lists when helpful.
- Do NOT invent exact fees, cutoffs, seat counts or exam dates. Say "check the official website" for those.
- Give a few options with pros and cons instead of one "best" answer.
- Ask at most ONE follow-up question at the end.
- Only talk about careers, education, skills, exams and study plans. If asked something else, politely bring the topic back.
{INDIA_CONTEXT}"""


def parse_json(text: str):
    """Llama sometimes wraps JSON in extra text. Try hard to extract it."""
    try:
        return json.loads(text)
    except Exception:
        pass
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except Exception:
            return None
    return None


# ---------- chat ----------

class ChatIn(BaseModel):
    message: str
    page: Optional[str] = None


@router.post("/chat")
def chat(data: ChatIn, user: dict = Depends(get_current_user)):
    text = data.message.strip()
    if not text:
        raise HTTPException(400, "Message is empty")

    with get_conn() as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE user_id = ? "
            "ORDER BY id DESC LIMIT 10",
            (user["id"],),
        ).fetchall()
    history = [dict(r) for r in reversed(rows)]

    messages = (
        [{"role": "system", "content": system_prompt(user, data.page)}]
        + history
        + [{"role": "user", "content": text}]
    )

    try:
        response = ollama.chat(model=MODEL, messages=messages)
        reply = response["message"]["content"].strip()
    except Exception as error:
        raise HTTPException(503, f"AI is not running. Start Ollama. ({error})")

    with get_conn() as conn:
        conn.execute(
            "INSERT INTO messages (user_id, role, content) VALUES (?, 'user', ?)",
            (user["id"], text),
        )
        conn.execute(
            "INSERT INTO messages (user_id, role, content) VALUES (?, 'assistant', ?)",
            (user["id"], reply),
        )

    return {"reply": reply}


@router.get("/chat/history")
def chat_history(user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE user_id = ? "
            "ORDER BY id DESC LIMIT 30",
            (user["id"],),
        ).fetchall()
    return {"messages": [dict(r) for r in reversed(rows)]}


@router.delete("/chat/history")
def clear_history(user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        conn.execute("DELETE FROM messages WHERE user_id = ?", (user["id"],))
    return {"ok": True}


# ---------- career guidance roadmap ----------

class GuidanceIn(BaseModel):
    stage: str          # "10th" | "Intermediate" | "Degree" | "B.Tech"
    interest: str       # "IT" | "Non-IT" | "Not sure"
    details: str = ""   # free text: subjects, marks, hobbies, goals


@router.post("/guidance")
def guidance(data: GuidanceIn, user: dict = Depends(get_current_user)):
    # remember the student's stage/interest so the chatbot knows it too
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET stage = ?, interest = ? WHERE id = ?",
            (data.stage, data.interest, user["id"]),
        )

    prompt = f"""You are a career counsellor for students in India.

Student stage: {data.stage}
Interest area: {data.interest}
Extra details from the student: {data.details or "none"}

{INDIA_CONTEXT}

Give 3 realistic career paths that fit this student.
If the interest is "Not sure", include a mix of IT and Non-IT paths.

Return ONLY valid JSON in exactly this shape:
{{
  "summary": "2 short sentences about the student's situation",
  "paths": [
    {{
      "title": "career path name",
      "type": "IT or Non-IT",
      "why_fit": "1-2 sentences",
      "steps": ["step 1", "step 2", "step 3", "step 4"],
      "skills_to_learn": ["skill", "skill", "skill"],
      "exams_or_courses": ["exam or course", "exam or course"],
      "time_to_first_job": "e.g. 3-4 years"
    }}
  ],
  "next_30_days": ["action 1", "action 2", "action 3"],
  "warning": "one honest caution, e.g. verify dates and fees on official websites"
}}

Rules:
- Do not invent exact fees, cutoffs, salaries or dates.
- Keep every string short and simple.
- No markdown, no text outside the JSON."""

    try:
        response = ollama.chat(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            format="json",
        )
        raw = response["message"]["content"]
    except Exception as error:
        raise HTTPException(503, f"AI is not running. Start Ollama. ({error})")

    result = parse_json(raw)
    if not result or "paths" not in result:
        raise HTTPException(502, "AI gave an unreadable answer. Please try again.")
    return result