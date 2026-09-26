import { useState } from "react";
import { api } from "../backend/api";

const STAGES = ["10th", "Intermediate", "Degree", "B.Tech"];
const INTERESTS = ["IT", "Non-IT", "Not sure"];

function List({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="cc-block">
      <h4>{title}</h4>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// Used in App.jsx as: <Roadmap user={user} setPage={setPage} />
export default function Roadmap({ user }) {
  const [stage, setStage] = useState(
    STAGES.includes(user?.stage) ? user.stage : "10th"
  );
  const [interest, setInterest] = useState(
    INTERESTS.includes(user?.interest) ? user.interest : "Not sure"
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
    <div className="stack">
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Find your career path</h2>
        <p className="cc-dim">
          Tell us where you are now. The AI suggests paths, steps and what to do
          in the next 30 days. Telugu or English rendu kuda ok.
        </p>

        <div className="cc-form-grid">
          <div>
            <label className="cc-label" htmlFor="cc-stage">
              I have completed
            </label>
            <select
              id="cc-stage"
              className="cc-input"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="cc-label" htmlFor="cc-interest">
              Interested in
            </label>
            <select
              id="cc-interest"
              className="cc-input"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
            >
              {INTERESTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="cc-label" htmlFor="cc-details">
          About you (optional)
        </label>
        <textarea
          id="cc-details"
          className="cc-input"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Subjects, marks, hobbies, budget, goals..."
        />

        <div style={{ marginTop: 18 }}>
          <button className="cc-btn" onClick={generate} disabled={loading}>
            {loading ? "Preparing your roadmap..." : "Get my roadmap"}
          </button>
        </div>

        {loading && (
          <p className="cc-dim">
            Local model kabatti 30-60 seconds pattochu.
          </p>
        )}
        {error && <div className="cc-error">{error}</div>}
      </section>

      {result && (
        <>
          {result.summary && <p className="cc-dim">{result.summary}</p>}

          {(result.paths || []).map((path, i) => (
            <section className="panel" key={i}>
              <div className="cc-path-head">
                <h3>{path.title}</h3>
                {path.type && <span className="cc-tag">{path.type}</span>}
              </div>

              <p className="cc-dim">{path.why_fit}</p>

              <List title="Steps" items={path.steps} />
              <List title="Skills to learn" items={path.skills_to_learn} />
              <List title="Exams / courses" items={path.exams_or_courses} />

              {path.time_to_first_job && (
                <p className="cc-dim">
                  Time to first job: {path.time_to_first_job}
                </p>
              )}
            </section>
          ))}

          {result.next_30_days && (
            <section className="panel cc-next">
              <h3 style={{ marginTop: 0 }}>Your next 30 days</h3>
              <ul>
                {result.next_30_days.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </section>
          )}

          {result.warning && <p className="cc-dim">{result.warning}</p>}
        </>
      )}
    </div>
  );
}