import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "../backend/api";

const STAGES = ["10th", "Intermediate", "Degree", "B.Tech"];
const INTERESTS = ["IT", "Non-IT", "Not sure"];

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    stage: "10th",
    interest: "Not sure",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;
      const data = await api(`/auth/${mode}`, { method: "POST", body });
      onAuth(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onEnter = (e) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card" onKeyDown={onEnter}>
        <div className="logo-icon">
          <Sparkles size={20} />
        </div>

        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="sub">
          {mode === "login"
            ? "Log in to continue your career journey."
            : "Get a personal roadmap for your studies and career."}
        </p>

        {mode === "register" && (
          <>
            <label>Name</label>
            <input value={form.name} onChange={update("name")} />
          </>
        )}

        <label>Email</label>
        <input type="email" value={form.email} onChange={update("email")} />

        <label>Password</label>
        <input
          type="password"
          value={form.password}
          onChange={update("password")}
        />

        {mode === "register" && (
          <>
            <label>I have completed</label>
            <select value={form.stage} onChange={update("stage")}>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <label>Interested in</label>
            <select value={form.interest} onChange={update("interest")}>
              {INTERESTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </>
        )}

        {error && <div className="auth-error">{error}</div>}

        <button
          className="secondary-btn auth-submit"
          onClick={submit}
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : mode === "login"
            ? "Log in"
            : "Create account"}
        </button>

        <p className="auth-switch">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setError("");
              setMode(mode === "login" ? "register" : "login");
            }}
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}