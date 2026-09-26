import { useState } from "react";
import { FileCheck, RefreshCw, Upload } from "lucide-react";

// MockInterview.jsx: <ResumeChecker api={api} />
export default function ResumeChecker({ api }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("For now, upload a plain .txt export of your resume, or paste the text below.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ""));
    reader.readAsText(file);
  };

  const check = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api("/resume/check", { method: "POST", body: { resume_text: text } }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>ATS resume checker</h3>
          <p className="dim">Paste your resume text (or upload a .txt file) to see how it scores for your goal.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setOpen((v) => !v)}>
          <FileCheck size={15} />
          {open ? "Hide" : "Check my resume"}
        </button>
      </div>

      {open && (
        <>
          <label className="btn btn-ghost self-start" style={{ marginBottom: 12 }}>
            <Upload size={15} />
            Upload .txt
            <input type="file" accept=".txt" onChange={onFile} style={{ display: "none" }} />
          </label>

          <textarea
            className="answer-input"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your resume text here..."
          />

          {error && (
            <div className="notice" role="alert">
              <div>
                <strong>Could not check</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <button className="btn btn-primary" onClick={check} disabled={busy || text.trim().length < 40}>
            {busy ? <RefreshCw size={15} className="spin" /> : <FileCheck size={15} />}
            {busy ? "Checking" : "Check my resume"}
          </button>

          {result && (
            <div className="resume-result">
              <div className="resume-score">
                <strong>{result.ats_score}%</strong>
                <span>ATS match score {result.engine === "offline" ? "(offline check)" : "(Llama 3)"}</span>
              </div>

              {result.missing_keywords?.length > 0 && (
                <div className="cc-block">
                  <h4>Missing keywords</h4>
                  <div className="chip-row">
                    {result.missing_keywords.map((k) => (
                      <span className="chip chip-bad" key={k}>
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.strengths?.length > 0 && (
                <div className="cc-block">
                  <h4>Strengths</h4>
                  <ul>
                    {result.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.weaknesses?.length > 0 && (
                <div className="cc-block">
                  <h4>Weak points</h4>
                  <ul>
                    {result.weaknesses.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.suggestions?.length > 0 && (
                <div className="cc-block">
                  <h4>Suggested changes</h4>
                  <ul>
                    {result.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}