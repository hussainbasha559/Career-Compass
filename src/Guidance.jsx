import { useState } from "react";
import { api } from "../backend/api";

const STAGES = ["10th", "Intermediate", "Degree", "B.Tech"];
const INTERESTS = ["IT", "Non-IT", "Not sure"];

function List({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="path-block">
      <h4>{title}</h4>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Guidance({ user }) {
  const [stage, setStage] = useState(
    STAGES.includes(user.stage) ? user.stage : "10th"
  );
  const [interest, setInterest] = useState(
    INTERESTS.includes(user.interest) ? user.interest : "Not sure"
  );
  const [details, setDetails] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api("/guidance", {
        method: "POST",
        body: { stage, interest, details },
      });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="content narrow">
      <div className="page-card">
        <h2 style={{ marginTop: 0 }}>Find your career path</h2>
        <p>
          Tell us where you are now. The AI will suggest paths, steps and what
          to do in the next 30 days.
        </p>

        <div className="guidance-form">
          <div>
            <label>I have completed</label>
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Interested in</label>
            <select
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
            >
              {INTERESTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <label>About you (optional)</label>
        <textarea
          className="answer-box"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Subjects, marks, hobbies, budget, goals... Telugu or English"
        />

        <button
          className="secondary-btn"
          onClick={generate}
          disabled={loading}
        >
          {loading ? "AI is preparing your roadmap..." : "Get my roadmap"}
        </button>

        {loading && (
          <p className="hint">This can take 30-60 seconds on a local model.</p>
        )}
        {error && <div className="auth-error">{error}</div>}
      </div>

      {result && (
        <div className="guidance-result">
          {result.summary && <p className="summary">{result.summary}</p>}

          {(result.paths || []).map((path, i) => (
            <div className="card path-card" key={i}>
              <div className="path-head">
                <h3>{path.title}</h3>
                {path.type && <span className="tag">{path.type}</span>}
              </div>

              <p>{path.why_fit}</p>

              <List title="Steps" items={path.steps} />
              <List title="Skills to learn" items={path.skills_to_learn} />
              <List title="Exams / courses" items={path.exams_or_courses} />

              {path.time_to_first_job && (
                <p className="hint">
                  Time to first job: {path.time_to_first_job}
                </p>
              )}
            </div>
          ))}

          {result.next_30_days && (
            <div className="recommendation">
              <div>
                <strong>Your next 30 days</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {result.next_30_days.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {result.warning && <p className="hint">{result.warning}</p>}
        </div>
      )}
    </section>
  );
}