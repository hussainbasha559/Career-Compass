import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brain,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  Compass,
  RefreshCw,
  Send,
  Database,
  RotateCcw,
  Cpu,
  Check,
  ShieldCheck,
  LogOut,
  Flag,
  Sun,
  Moon,
  Pencil,
  Trash2,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import ResumeChecker from "./ResumeChecker";
import VoiceMic from "./VoiceMic";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import "./App.css";

/* ------------------------------------------------------------------ */
/* API helpers                                                         */
/* ------------------------------------------------------------------ */

const API = "https://career-compass-1-owyk.onrender.com";

const TOKEN_KEY = "cc_token";
const THEME_KEY = "cc_theme";

const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: session just will not survive a refresh */
  }
};

async function api(path, options) {
  let res;
  try {
    res = await fetch(`${API}${path}`, options);
  } catch {
    throw new Error("Cannot reach the backend. Start it with: uvicorn main:app --reload");
  }
  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined") window.location.reload();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.detail) {
        detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

const post = (path, body = {}) =>
  api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const toneFor = (score) => (score >= 70 ? "good" : score >= 50 ? "warn" : "bad");
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

// Suggestions only. Students can type any goal and Llama 3 works out the skills.
const GOAL_OPTIONS = [
  "Software Developer",
  "Data Analyst",
  "UPSC Civil Services",
  "APPSC / TSPSC Group 1",
  "SSC / Railway / Banking Exams",
  "Civil Engineer",
  "School Teacher (TET / DSC)",
  "Staff Nurse",
  "Marketing Executive",
];

function useCycle(active, messages, ms = 2800) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) {
      setI(0);
      return undefined;
    }
    const t = setInterval(() => setI((v) => (v + 1) % messages.length), ms);
    return () => clearInterval(t);
  }, [active, messages.length, ms]);
  return messages[i];
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "light" ? "dark" : "light"))];
}

/* ------------------------------------------------------------------ */
/* Shared UI                                                           */
/* ------------------------------------------------------------------ */

function Panel({ className = "", children, ...rest }) {
  return (
    <section className={`panel ${className}`} {...rest}>
      {children}
    </section>
  );
}

function ThemeToggle({ theme, onToggle, className = "" }) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      onClick={onToggle}
      title={theme === "light" ? "Switch to black and white mode" : "Switch to light mode"}
      aria-label="Toggle colour theme"
    >
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}

function ScoreRing({ value = 0, size = 116, stroke = 9, caption, tone }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 80);
    return () => clearTimeout(t);
  }, [value]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(shown, 100) / 100) * c;
  const count = useCountUp(value);

  return (
    <div className={`ring tone-${tone || toneFor(value)}`} style={{ width: size, height: size, "--size": `${size}px` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">
        <strong>{count}%</strong>
        {caption && <span>{caption}</span>}
      </div>
    </div>
  );
}

function Loader({ text = "Loading" }) {
  return (
    <div className="loader" role="status">
      <div className="loader-bars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p>{text}</p>
    </div>
  );
}

function Notice({ tone = "bad", title, children }) {
  return (
    <div className={`notice notice-${tone}`} role="alert">
      <AlertCircle size={18} />
      <div>
        {title && <strong>{title}</strong>}
        <p>{children}</p>
      </div>
    </div>
  );
}

function LoadFail({ title, message, onRetry }) {
  return (
    <Panel className="load-fail">
      <Notice title={title}>{message}</Notice>
      <button className="btn btn-primary" onClick={onRetry}>
        <RefreshCw size={16} />
        Try again
      </button>
    </Panel>
  );
}

function Chip({ children, tone = "plain", icon }) {
  return (
    <span className={`chip chip-${tone}`}>
      {icon}
      {children}
    </span>
  );
}

/* Resource card — used by the roadmap and by the next-best-action panel.
   Always opens in a new tab. Never invents a URL: if none is given, it
   renders as a plain (non-clickable) note instead of a dead link. */
function ResourceCard({ resource }) {
  const { title, type, url, description } = resource || {};
  if (!title) return null;
  const Wrapper = url ? "a" : "div";
  const wrapperProps = url
    ? { href: url, target: "_blank", rel: "noopener noreferrer" }
    : {};
  return (
    <Wrapper className="resource-card" {...wrapperProps}>
      <div className="resource-card-head">
        <BookOpen size={16} />
        <span className="resource-card-title">{title}</span>
        {type && <Chip tone="ice">{type}</Chip>}
      </div>
      {description && <p className="dim">{description}</p>}
      {url && (
        <span className="resource-card-link">
          Open resource <ExternalLink size={13} />
        </span>
      )}
    </Wrapper>
  );
}

function ResourceGrid({ resources }) {
  if (!resources || resources.length === 0) return null;
  return (
    <div className="resource-grid">
      {resources.map((r, i) => (
        <ResourceCard key={`${r.title}-${i}`} resource={r} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The compass loop                                                    */
/* ------------------------------------------------------------------ */

function CompassLoop({ plan }) {
  const steps = plan?.steps || [];
  const n = steps.length || 7;
  const S = 520;
  const C = S / 2;
  const R = 132;
  const LR = 172; // label radius for top/bottom nodes

  const currentIdx = plan?.current ? steps.findIndex((s) => s.id === plan.current) : -1;
  const doneCount = steps.filter((s) => s.done).length;
  const needleDeg = (currentIdx >= 0 ? currentIdx : 0) * (360 / n);
  const circ = 2 * Math.PI * R;
  const arc = (doneCount / n) * circ;

  return (
    <svg className="compass" viewBox={`0 0 ${S} ${S}`} role="img" aria-label="Career loop progress">
      <circle className="tick-ring" cx={C} cy={C} r="248" />
      <circle className="inner-ring" cx={C} cy={C} r="92" />
      <circle className="inner-ring" cx={C} cy={C} r="50" />
      <circle className="loop-track" cx={C} cy={C} r={R} />
      <circle
        className="loop-arc"
        cx={C}
        cy={C}
        r={R}
        strokeDasharray={`${arc} ${circ}`}
        transform={`rotate(-90 ${C} ${C})`}
      />

      {steps.map((s, i) => {
        const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
        const x = C + R * Math.cos(a);
        const y = C + R * Math.sin(a);
        // Side nodes get their label anchored outward so text never touches the node.
        const side = Math.cos(a) > 0.6 ? "start" : Math.cos(a) < -0.6 ? "end" : "middle";
        const labelR = side === "middle" ? LR : R + 26;
        const lx = C + labelR * Math.cos(a);
        const ly = C + labelR * Math.sin(a);
        const state = s.done ? "done" : i === currentIdx ? "current" : "todo";
        return (
          <g key={s.id} className={`node node-${state}`}>
            <title>{s.hint}</title>
            {state === "current" && <circle className="node-pulse" cx={x} cy={y} r="15" />}
            <circle className="node-dot" cx={x} cy={y} r="9" />
            <text className="node-label" x={lx} y={ly} textAnchor={side} dominantBaseline="middle">
              {s.label}
            </text>
          </g>
        );
      })}

      <g
        className="needle"
        style={{ transform: `rotate(${needleDeg}deg)`, transformOrigin: `${C}px ${C}px` }}
      >
        <polygon className="needle-tip" points={`${C},${C - R + 24} ${C + 8},${C} ${C - 8},${C}`} />
        <polygon className="needle-tail" points={`${C},${C + 48} ${C + 8},${C} ${C - 8},${C}`} />
      </g>
      <circle className="hub" cx={C} cy={C} r="10" />
      <circle className="hub-core" cx={C} cy={C} r="3.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Count-up + gap bar                                                  */
/* ------------------------------------------------------------------ */

function useCountUp(target, ms = 1000) {
  const [val, setVal] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    const from = last.current;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min((t - start) / ms, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (target - from) * eased);
      last.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

function GapBar({ skill, target, biggest }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(skill.score), 120);
    return () => clearTimeout(t);
  }, [skill.score]);
  const score = useCountUp(skill.score);

  return (
    <div className={`gapbar-row tone-${toneFor(skill.score)} ${biggest ? "is-biggest" : ""}`}>
      <div className="gb-head">
        <h3>{skill.name}</h3>
        <span className={`status status-${toneFor(skill.score)}`}>{skill.status}</span>
        {biggest && <Chip tone="signal">Biggest gap</Chip>}
        <span className="gb-score">{score}%</span>
      </div>

      <div className="gapbar">
        <div className="gapbar-fill" style={{ width: `${shown}%` }} />
        <div
          className="gapbar-gap"
          style={{ left: `${shown}%`, width: `${Math.max(target - shown, 0)}%` }}
        />
        <div className="gapbar-target" style={{ left: `${target}%` }}>
          <span>Target {target}%</span>
        </div>
      </div>

      <p className="gb-foot">
        {skill.gap > 0 ? <strong>{skill.gap} points to reach the target.</strong> : <strong>Target reached.</strong>}{" "}
        Practice level: {skill.level}.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Home (landing)                                                      */
/* ------------------------------------------------------------------ */

const PILLARS = [
  {
    icon: Brain,
    title: "Measure",
    text: "An assessment and adaptive practice show exactly where you stand in every skill your goal needs.",
  },
  {
    icon: TrendingUp,
    title: "Improve",
    text: "Every action targets your biggest gap, at a difficulty that matches your current score.",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    text: "An AI mock interview checks you can explain it. Any weakness it finds becomes your next action.",
  },
];

function GoalPanel({ profile, skills, onChangeGoal }) {
  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState(profile.goal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e) => {
    e.preventDefault();
    const next = goal.trim();
    if (!next || next === profile.goal) {
      setEditing(false);
      return;
    }
    if (!window.confirm("Changing your goal rebuilds your skills and restarts your progress. Continue?")) return;
    setBusy(true);
    setError("");
    try {
      await onChangeGoal(next);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <div className="panel-head">
        <div>
          <h3>Your goal</h3>
          <p className="dim">Everything here is built around it: skills, questions and your coach.</p>
        </div>
      </div>

      {!editing ? (
        <>
          <p className="lead">{profile.goal}</p>
          <div className="skill-tags">
            {(skills.length ? skills.map((s) => s.name) : profile.skills || []).map((name) => (
              <Chip key={name} tone="ice">
                {name}
              </Chip>
            ))}
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setGoal(profile.goal);
              setEditing(true);
            }}
          >
            <Pencil size={15} />
            Change my goal
          </button>
        </>
      ) : (
        <form className="goal-form" onSubmit={save}>
          <label className="field">
            <span>New career goal</span>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              list="goal-options-home"
              placeholder="For example: UPSC Civil Services"
              autoFocus
            />
            <datalist id="goal-options-home">
              {GOAL_OPTIONS.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <small>Type anything. Llama 3 works out which skills you need.</small>
          </label>
          {error && <Notice title="Could not change your goal">{error}</Notice>}
          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={busy || !goal.trim()}>
              {busy ? "Building your skills" : "Save goal"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Panel>
  );
}

function Home({ profile, skills, plan, next, go, setPage, assessed, onChangeGoal }) {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <Chip tone="ice" icon={<Sparkles size={13} />}>
            AI career coach for every career path
          </Chip>
          <h1 className="hero-title">We don't just tell you what to learn. We prove you learned it.</h1>
          <p className="hero-sub">
            Aiming for a software job, a government exam, civil services or an engineering role? Career Compass
            measures your skills, finds your biggest gap, gives you the next best action, verifies your improvement,
            then tests you in an AI mock interview. It finds your next weakness and starts again.
          </p>

          <div className="btn-row">
            <button className="btn btn-primary btn-lg" onClick={() => go(next.page)}>
              {next.page === "assessment" ? "Start your assessment" : `Continue: ${next.label}`}
              <ArrowRight size={18} />
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => setPage("gap")}>
              View my skill gap
            </button>
          </div>

          <div className="hero-student">
            <div className="avatar">{profile.name.charAt(0)}</div>
            <div>
              <strong>{profile.name}</strong>
              <span>Goal: {profile.goal}</span>
            </div>
            <Chip tone="warn">Target {profile.target_score}%</Chip>
          </div>
        </div>

        <div className="hero-visual">
          <CompassLoop plan={plan} />
          <div className="compass-caption">
            {plan?.current === null ? (
              <>
                <strong>Loop complete</strong>
                <span>Follow your next action to run it again. Cycles finished: {plan.cycles_completed}.</span>
              </>
            ) : plan?.steps.find((s) => s.id === plan.current) ? (
              <>
                <strong>You are at: {plan.steps.find((s) => s.id === plan.current).label}</strong>
                <span>{plan.steps.find((s) => s.id === plan.current).hint}.</span>
              </>
            ) : (
              <span>Waiting for the backend.</span>
            )}
          </div>
        </div>
      </section>

      <section className="pillars">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div className="pillar" key={p.title}>
              <div className="pillar-icon">
                <Icon size={22} />
              </div>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          );
        })}
      </section>

      <section className="live-grid">
        <GoalPanel profile={profile} skills={skills} onChangeGoal={onChangeGoal} />

        <Panel className="live-profile">
          <div className="panel-head">
            <div>
              <h3>Live skill profile</h3>
              <p className="dim">
                {assessed
                  ? "Updates after every assessment, practice and interview."
                  : "Take the assessment to measure your real starting point."}
              </p>
            </div>
            <Chip tone="ice">Target {profile.target_score}%</Chip>
          </div>
          <div className="ring-row spread">
            {skills.map((s) => (
              <div className="ring-item" key={s.name}>
                <ScoreRing value={s.score} size={112} />
                <span>{s.name}</span>
                <em className={`status status-${toneFor(s.score)}`}>{assessed ? s.status : "Not measured yet"}</em>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2: Skill gap + next best action                                */
/* ------------------------------------------------------------------ */

const ROUTE_LABEL = { practice: "Start practice", interview: "Start mock interview" };
const SOURCE_LABEL = {
  interview: "Created by your last interview",
  loop: "Next step in your loop",
  "skill-gap": "Based on your largest skill gap",
};

function SkillGap({ skills, skillGap, nextAction, progress, setPage, goal, assessed }) {
  const biggest = skillGap?.highest_gap?.name;
  const target = skillGap?.target_score || 70;
  const gapInfo = progress?.latest_gap;

  if (!skills.length) return <Loader text="Analysing your skills" />;

  return (
    <div className="stack">
      {!assessed && (
        <Notice tone="signal" title="You have not taken the assessment yet">
          Every skill starts at 0% until you do. Take the assessment to see your real gaps.
        </Notice>
      )}

      <Panel>
        <div className="panel-head">
          <div>
            <h3>Distance to your target</h3>
            <p className="dim">
              The hatched area is the gap. The black line is the {target}% target for {goal}.
            </p>
          </div>
          {biggest && skillGap.highest_gap.gap > 0 && (
            <Chip tone="signal" icon={<AlertCircle size={13} />}>
              Biggest gap: {biggest}, {skillGap.highest_gap.gap} points
            </Chip>
          )}
        </div>
        <div className="gapbars">
          {skills.map((s) => (
            <GapBar key={s.name} skill={s} target={target} biggest={s.name === biggest && s.gap > 0} />
          ))}
        </div>
      </Panel>

      <Panel className="action-panel">
        {nextAction ? (
          <>
            <Chip tone="signal" icon={<Compass size={14} />}>
              {SOURCE_LABEL[nextAction.source]}
            </Chip>
            <h2 className="action-question">What is my next best action?</h2>
            <p className="action-title">{nextAction.action}</p>

            <dl className="facts">
              <div>
                <dt>Which skill gap it addresses</dt>
                <dd>{nextAction.addresses}</dd>
              </div>
              <div>
                <dt>Where you are</dt>
                <dd>
                  {nextAction.skill} at {nextAction.current_score}%, {nextAction.gap} points below target
                </dd>
              </div>
              <div>
                <dt>Time needed</dt>
                <dd>{nextAction.duration}</dd>
              </div>
              <div>
                <dt>How it helps you improve</dt>
                <dd>{nextAction.expected}</dd>
              </div>
            </dl>

            <p className="why">
              <strong>Why now:</strong> {nextAction.why}
            </p>

            {nextAction.resources?.length > 0 && (
              <div className="action-resources">
                <p className="action-resources-label">Resources for this step</p>
                <ResourceGrid resources={nextAction.resources} />
              </div>
            )}

            <button className="btn btn-primary btn-lg" onClick={() => setPage(nextAction.route)}>
              {ROUTE_LABEL[nextAction.route] || "Start"}
              <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <Loader text="Calculating your next best action" />
        )}
      </Panel>

      <Panel className="roadmap-teaser">
        <div>
          <h3>Want the full plan?</h3>
          <p className="dim">Get a milestone roadmap that turns these gaps into weekly goals.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setPage("roadmap")}>
          <Flag size={16} />
          View my roadmap
        </button>
      </Panel>

      {gapInfo && (
        <Panel className="gap-panel">
          <Chip tone="signal" icon={<AlertCircle size={13} />}>
            Latest weakness from your mock interview
          </Chip>
          <h3 className="gap-title">
            {gapInfo.skill}: {gapInfo.title}
          </h3>
          <p className="dim">{gapInfo.reason}</p>
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Assessment                                                          */
/* ------------------------------------------------------------------ */

function AssessmentReview({ results }) {
  if (!results) return null;
  const skillNames = Object.keys(results);
  if (skillNames.length === 0) return null;

  return (
    <div className="stack">
      {skillNames.map((skill) => (
        <Panel key={skill}>
          <div className="panel-head">
            <h3>{skill}: review</h3>
          </div>
          <div className="review-list">
            {results[skill].map((r, i) => (
              <div className={`review-row ${r.is_correct ? "right" : "wrong"}`} key={i}>
                <p className="review-q">
                  {i + 1}. {r.question}
                </p>
                <div className="review-ans">
                  <span>
                    Your answer: <span className={r.is_correct ? "" : "wrong-ans"}>{r.user_answer || "(skipped)"}</span>
                  </span>
                  {!r.is_correct && (
                    <span>
                      Correct answer: <span className="right-ans">{r.correct_answer}</span>
                    </span>
                  )}
                </div>
                <div className="score-chip-row">
                  {r.is_correct ? (
                    <Chip tone="good" icon={<CheckCircle2 size={13} />}>
                      Correct
                    </Chip>
                  ) : (
                    <Chip tone="bad" icon={<XCircle size={13} />}>
                      Wrong
                    </Chip>
                  )}
                </div>
                {r.explanation && (
                  <div className="cc-block">
                    <h4>Explanation</h4>
                    <p>{r.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Assessment({ assessment, loadError, loadAssessment, result, setResult, refreshCore, setPage }) {
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showReview, setShowReview] = useState(false);

  if (!assessment) {
    return loadError ? (
      <LoadFail title="Could not load your assessment" message={loadError} onRetry={loadAssessment} />
    ) : (
      <Loader text="Llama 3 is writing questions for your goal. The first time can take up to a minute." />
    );
  }

  const total = Object.values(assessment.questions).reduce((sum, qs) => sum + qs.length, 0);
  const answered = Object.keys(answers).length;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const token = getToken();
      const data = await post("/assessment/evaluate", { answers, token });
      setResult(data);
      setShowReview(false);
      await refreshCore();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Overall correct/wrong counts, derived from the per-question review the
  // backend returns (falls back gracefully if an older backend only sends scores).
  const totals = result?.results
    ? Object.values(result.results).reduce(
        (acc, rows) => {
          rows.forEach((r) => (r.is_correct ? acc.correct++ : acc.wrong++));
          return acc;
        },
        { correct: 0, wrong: 0 }
      )
    : null;
  const overall = result
    ? Math.round(Object.values(result.scores).reduce((a, b) => a + b, 0) / Object.values(result.scores).length)
    : 0;

  return (
    <div className="stack">
      {Object.entries(assessment.questions).map(([skill, questions]) => (
        <Panel key={skill}>
          <div className="panel-head">
            <h3>{skill}</h3>
            <Chip>{questions.length} questions</Chip>
          </div>

          {questions.map((q, index) => {
            const key = `${skill}_${index}`;
            return (
              <fieldset className="question" key={key}>
                <legend>
                  {index + 1}. {q.question}
                </legend>
                <div className="options">
                  {q.options.map((option) => (
                    <label key={option} className={`option ${answers[key] === option ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name={key}
                        value={option}
                        checked={answers[key] === option}
                        onChange={() => setAnswers((prev) => ({ ...prev, [key]: option }))}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </Panel>
      ))}

      {error && <Notice title="Could not submit">{error}</Notice>}

      <div className="submit-bar">
        <span className="dim">
          {answered} of {total} answered
        </span>
        <button className="btn btn-primary" disabled={busy || answered < total} onClick={submit}>
          {busy ? "Scoring" : "Score my assessment"}
        </button>
      </div>

      {result && (
        <Panel className="glow-border">
          <div className="panel-head">
            <h3>Your starting profile</h3>
            <Chip tone="good" icon={<CheckCircle2 size={13} />}>
              Skill scores updated
            </Chip>
          </div>
          <div className="ring-row">
            {Object.entries(result.scores).map(([skill, score]) => (
              <div className="ring-item" key={skill}>
                <ScoreRing value={score} size={110} />
                <span>{skill}</span>
              </div>
            ))}
          </div>

          {totals && (
            <div className="score-chip-row">
              <Chip tone="good" icon={<CheckCircle2 size={13} />}>
                Correct: {totals.correct} / {totals.correct + totals.wrong}
              </Chip>
              <Chip tone="bad" icon={<XCircle size={13} />}>
                Wrong: {totals.wrong} / {totals.correct + totals.wrong}
              </Chip>
              <Chip tone="ice">Overall score: {overall}%</Chip>
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => setPage("gap")}>
              See my skill gap
              <ArrowRight size={17} />
            </button>
            {result.results && (
              <button className="btn btn-ghost" onClick={() => setShowReview((v) => !v)}>
                {showReview ? "Hide review" : "Review my answers"}
              </button>
            )}
          </div>
        </Panel>
      )}

      {result?.results && showReview && <AssessmentReview results={result.results} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Practice                                                             */
/* ------------------------------------------------------------------ */

const PRACTICE_THINKING = [
  "AI is evaluating your answer",
  "Comparing against the model answer",
  "Checking what concepts you covered",
  "Almost done",
];

const RESULT_META = {
  correct: { label: "Correct", icon: CheckCircle2, cls: "result-good", chip: "good" },
  partially_correct: { label: "Partially Correct", icon: AlertTriangle, cls: "result-partial", chip: "warn" },
  incorrect: { label: "Incorrect", icon: XCircle, cls: "result-bad", chip: "bad" },
};

function Practice({ practice, loadError, result, setResult, draft, setDraft, loadPractice, refreshCore, setPage }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const thinking = useCycle(busy, PRACTICE_THINKING);

  if (!practice) {
    return loadError ? (
      <LoadFail title="Could not load your practice question" message={loadError} onRetry={() => loadPractice(true)} />
    ) : (
      <Loader text="Preparing your practice question. A new skill can take a little while the first time." />
    );
  }

  const isCode = practice.input_type === "code";

  const submit = async () => {
    if (!draft.trim() || busy) return; // no submissions while evaluation is running
    setBusy(true);
    setError("");
    try {
      const token = getToken();
      const body = { answer: draft, question_id: practice.question_id, token };
      const evaluation = await post("/practice/evaluate", body);
      const improvement = await post("/practice/improvement", body);
      setResult({ evaluation, improvement, question_id: practice.question_id });
      await refreshCore();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    setResult(null);
    setDraft("");
    await loadPractice(true);
  };

  const shown = result && result.question_id === practice.question_id ? result : null;
  const meta = shown ? RESULT_META[shown.evaluation.result] || RESULT_META.incorrect : null;
  const ResultIcon = meta?.icon;

  return (
    <div className="stack">
      {practice.focus_note && (
        <Notice tone="signal" title={`Focus from your interview: ${practice.focus_note.title}`}>
          {practice.focus_note.reason} Show your reasoning, not only the answer.
        </Notice>
      )}

      <Panel className="glow-border">
        <div className="panel-head">
          <div>
            <p className="dim">
              {practice.skill}: {practice.topic}
            </p>
            <h2 className="question-text">{practice.question}</h2>
          </div>
          <Chip tone={practice.difficulty === "Hard" ? "bad" : practice.difficulty === "Medium" ? "warn" : "good"}>
            {practice.difficulty}
          </Chip>
        </div>
        <p className="dim">{practice.adaptive_reason}</p>

        <textarea
          className={isCode ? "code-input" : "answer-input"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            isCode ? "Write your code or query here..." : "Write your answer here. Show your working step by step."
          }
          rows={8}
          spellCheck={!isCode}
          disabled={busy || !!shown}
        />

        {error && <Notice title="Could not check your answer">{error}</Notice>}

        {!shown &&
          (busy ? (
            <Loader text={`🤖 ${thinking}...`} />
          ) : (
            <button className="btn btn-primary" onClick={submit} disabled={!draft.trim()}>
              Check my answer
            </button>
          ))}
      </Panel>

      {shown && (
        <Panel className={meta.cls}>
          <div className="result-head">
            <ResultIcon size={22} />
            <h3>{meta.label}</h3>
            <Chip tone={meta.chip}>Score: {shown.evaluation.score}/100</Chip>
          </div>

          {shown.evaluation.result === "correct" && (
            <div className="cc-block">
              <h4>Explanation</h4>
              <p>{shown.evaluation.explanation}</p>
            </div>
          )}

          {shown.evaluation.result === "partially_correct" && (
            <>
              <div className="cc-block">
                <h4>What you got right</h4>
                <p>{shown.evaluation.explanation}</p>
              </div>
              {shown.evaluation.missing_concepts?.length > 0 && (
                <div className="cc-block">
                  <h4>What is missing</h4>
                  <ul>
                    {shown.evaluation.missing_concepts.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {shown.evaluation.result === "incorrect" && (
            <>
              <div className="cc-block">
                <h4>Correct answer</h4>
                <p>{shown.evaluation.correct_answer}</p>
              </div>
              <div className="cc-block">
                <h4>Why</h4>
                <p>{shown.evaluation.explanation}</p>
              </div>
              {shown.evaluation.missing_concepts?.length > 0 && (
                <div className="cc-block">
                  <h4>What you missed</h4>
                  <ul>
                    {shown.evaluation.missing_concepts.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {shown.evaluation.improvement_tip && (
            <div className="cc-block">
              <h4>How to improve</h4>
              <p>{shown.evaluation.improvement_tip}</p>
            </div>
          )}

          <div className="verify">
            <div className="verify-scores">
              <div>
                <span className="dim">{shown.improvement.skill} before</span>
                <strong>{shown.improvement.previous_score}%</strong>
              </div>
              <ArrowRight className="verify-arrow" size={22} />
              <div>
                <span className="dim">{shown.improvement.skill} now</span>
                <strong>{shown.improvement.new_score}%</strong>
              </div>
              <div className={`delta ${shown.improvement.improvement > 0 ? "up" : ""}`}>
                {signed(shown.improvement.improvement)}
              </div>
            </div>
            <p className="dim">
              {shown.improvement.verified
                ? "Improvement verified. Your skill score has been updated."
                : "No change to your score yet. Read the feedback above and try a new attempt."}
            </p>
          </div>

          <div className="btn-row">
            {shown.improvement.verified && (
              <button className="btn btn-primary" onClick={() => setPage("interview")}>
                Continue to mock interview
                <ArrowRight size={17} />
              </button>
            )}
            <button className="btn btn-ghost" onClick={next}>
              {shown.improvement.verified ? "Practice another question" : "Try again"}
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI Skill Coach: structured advice + open chat about anything        */
/* ------------------------------------------------------------------ */

const COACH_SECTIONS = [
  ["current_situation", "Where you are"],
  ["what_to_learn_next", "What to learn next"],
  ["why_next_focus", "Why this comes first"],
  ["practice_today", "What to practice today"],
  ["how_improving", "How you are improving"],
];

function Coach({ coach, loading, error, loadCoach, messages, setMessages, goal }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const box = boxRef.current;
    if (box && messages.length) box.scrollTop = box.scrollHeight;
  }, [messages, busy]);

  const prompts = [
    coach ? `Explain ${coach.skill} in simple words` : "Explain my next topic simply",
    `Make me a 7-day study plan for ${goal}`,
    "Give me 3 practice questions with answers",
    "What mistakes should I avoid?",
  ];

  const ask = async (text) => {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    const history = messages
      .filter((m) => !m.failed)
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    try {
      const data = await post("/coach/ask", { question, history });
      setMessages((m) => [...m, { role: "ai", text: data.answer, sources: data.sources }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", text: e.message, failed: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="coach-layout">
      <Panel className="glow-border">
        <div className="panel-head">
          <div>
            <h2 className="section-title">{coach ? `Focus on ${coach.skill}` : "Your coach"}</h2>
            {coach && (
              <p className="dim">
                Score {coach.score}%, {coach.gap} points to the target
              </p>
            )}
          </div>
          <div className="btn-row">
            {coach && (
              <Chip tone={coach.engine === "llama3" ? "ice" : "warn"} icon={<Cpu size={13} />}>
                {coach.engine === "llama3" ? "Llama 3" : "Offline advice"}
              </Chip>
            )}
            <button className="btn btn-ghost" onClick={() => loadCoach(true)} disabled={loading}>
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              Refresh advice
            </button>
          </div>
        </div>

        {error && <Notice title="The coach could not load">{error}</Notice>}
        {loading && !coach && <Loader text="Llama 3 is reading your skill profile" />}

        {coach && (
          <div className="coach-grid">
            {COACH_SECTIONS.map(([key, title], i) => (
              <div className={`coach-item ${i === 1 ? "coach-key" : ""}`} key={key}>
                <h4>{title}</h4>
                <p>{coach.sections[key]}</p>
              </div>
            ))}
          </div>
        )}

        {coach?.sources?.length > 0 && (
          <div className="sources">
            <Database size={14} />
            <span className="dim">Grounded in:</span>
            {coach.sources.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <div className="panel-head">
          <div>
            <h3>Ask your coach anything</h3>
            <p className="dim">Study topics, exam strategy, current affairs, maths, writing, careers. Anything.</p>
          </div>
          {messages.length > 0 && (
            <button className="btn btn-ghost" onClick={() => setMessages([])} disabled={busy}>
              <Trash2 size={15} />
              Clear chat
            </button>
          )}
        </div>

        <div className="messages" ref={boxRef}>
          {messages.length === 0 && <p className="dim">Try one of these, or type your own question.</p>}
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role} ${m.failed ? "failed" : ""}`}>
              <p>{m.text}</p>
              {m.sources?.length > 0 && <span className="dim">Sources: {m.sources.join(", ")}</span>}
            </div>
          ))}
          {busy && <Loader text="Thinking" />}
        </div>

        <div className="prompt-chips">
          {prompts.map((p) => (
            <button key={p} className="chip chip-button" onClick={() => ask(p)} disabled={busy}>
              {p}
            </button>
          ))}
        </div>

        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ask your AI coach..."
          />
          <button className="btn btn-primary" onClick={() => ask()} disabled={busy || !input.trim()}>
            <Send size={16} />
            Send
          </button>
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mock Interview                                                      */
/* ------------------------------------------------------------------ */

const THINKING = [
  "Retrieving reference notes",
  "Llama 3 is reading your answer",
  "Checking correctness",
  "Looking for your next weakness",
];

function MockInterview({
  interview,
  loadError,
  result,
  setResult,
  draft,
  setDraft,
  loadInterview,
  refreshCore,
  setPage,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const thinking = useCycle(busy, THINKING);

  if (!interview) {
    return loadError ? (
      <LoadFail title="Could not load your interview question" message={loadError} onRetry={() => loadInterview(true)} />
    ) : (
      <Loader text="Preparing your interview question. A new skill can take a little while the first time." />
    );
  }

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await post("/interview/evaluate", {
        skill: interview.skill,
        question: interview.question,
        answer: draft,
        topic: interview.topic,
      });
      setResult(data);
      await refreshCore();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const another = async () => {
    setResult(null);
    setDraft("");
    await loadInterview(true);
  };

  return (
    <div className="stack">
      <Panel className="glow-border">
        <div className="panel-head">
          <div className="chip-row">
            <Chip tone="ice">{interview.skill}</Chip>
            <Chip tone={interview.difficulty === "Hard" ? "bad" : interview.difficulty === "Medium" ? "warn" : "good"}>
              {interview.difficulty}
            </Chip>
            <Chip>Current score {interview.score}%</Chip>
          </div>
        </div>

        <div className="interviewer">
          <div className="ai-avatar">
            <Sparkles size={18} />
          </div>
          <h2 className="question-text">{interview.question}</h2>
        </div>

        <textarea
          className="answer-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your answer. Explain your reasoning and give an example."
          rows={8}
          disabled={busy || !!result}
        />

        {error && <Notice title="Could not evaluate your answer">{error}</Notice>}

        {busy ? (
          <Loader text={thinking} />
        ) : (
          !result && (
            <button className="btn btn-primary" onClick={submit} disabled={!draft.trim()}>
              Get AI feedback
            </button>
          )
        )}
      </Panel>

      {result && (
        <>
          <div className="eval-grid">
            <Panel className="score-panel">
              <ScoreRing value={result.score} size={148} stroke={11} caption="interview" />
              <div className="score-meta">
                <Chip tone={result.engine === "llama3" ? "ice" : "warn"} icon={<Cpu size={13} />}>
                  {result.engine === "llama3" ? "Evaluated by Llama 3" : "Offline evaluation"}
                </Chip>
                <p className="dim">
                  {result.skill_update.skill} skill score
                  <br />
                  <strong className="score-shift">
                    {result.skill_update.previous}% <ArrowRight size={14} /> {result.skill_update.new}%
                  </strong>
                </p>
              </div>
            </Panel>

            <div className="analysis">
              <Panel>
                <h4>Correctness</h4>
                <p>{result.technical_correctness || "No comment."}</p>
              </Panel>
              <Panel>
                <h4>Understanding</h4>
                <p>{result.understanding || "No comment."}</p>
              </Panel>
              <Panel>
                <h4>Clarity</h4>
                <p>{result.clarity || "No comment."}</p>
              </Panel>
            </div>
          </div>

          <Panel>
            <h4>Feedback</h4>
            <p>{result.feedback}</p>
            <p className="dim">
              <strong>Next focus:</strong> {result.next_focus}
            </p>
            {result.sources?.length > 0 && (
              <div className="sources">
                <Database size={14} />
                <span className="dim">Checked against:</span>
                {result.sources.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
            )}
          </Panel>

          <div className="loop-out">
            <Panel className="gap-panel">
              <Chip tone="signal" icon={<AlertCircle size={13} />}>
                New skill gap
              </Chip>
              <h3 className="gap-title">
                {result.new_gap.skill}: {result.new_gap.title}
              </h3>
              <p className="dim">{result.new_gap.reason}</p>
            </Panel>

            <Panel className="action-panel">
              <Chip tone="ice" icon={<Compass size={13} />}>
                Next best action
              </Chip>
              <h3 className="gap-title">{result.next_action.action}</h3>
              <p className="dim">{result.next_action.why}</p>
              {result.next_action.resources?.length > 0 && (
                <ResourceGrid resources={result.next_action.resources} />
              )}
              <div className="btn-row">
                <button className="btn btn-primary" onClick={() => setPage("practice")}>
                  Start this practice
                  <ArrowRight size={17} />
                </button>
                <button className="btn btn-ghost" onClick={() => setPage("progress")}>
                  See my journey
                </button>
              </div>
            </Panel>
          </div>

          <button className="btn btn-ghost self-start" onClick={another}>
            Try another interview question
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tip">
      <strong>{p.name}</strong>
      <span>Skill score: {p.score}%</span>
      {p.name !== "Initial" && <span>This attempt: {p.raw}%</span>}
      <em>{p.note}</em>
    </div>
  );
}

function Progress({ progress, setPage }) {
  const [sel, setSel] = useState(null);
  if (!progress) return <Loader text="Loading your journey" />;

  const active = sel || progress.focus_skill;
  const skill = progress.skills.find((s) => s.name === active) || progress.skills[0];
  const data = skill.events.map((e) => ({ name: e.label, score: e.score, raw: e.raw, note: e.note }));
  const lastInterview = [...progress.interviews].reverse().find((i) => i.skill === skill.name);
  const action = progress.next_action.skill === skill.name ? progress.next_action : null;
  const gapId = `grad-${skill.name.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div className="stack">
      <div className="progress-skills">
        {progress.skills.map((s) => (
          <button
            key={s.name}
            className={`progress-skill tone-${toneFor(s.current)} ${s.name === skill.name ? "active" : ""}`}
            onClick={() => setSel(s.name)}
          >
            <span className="ps-name">{s.name}</span>
            <span className="ps-score">
              {s.initial}% <ArrowRight size={14} /> {s.current}%
            </span>
            <span className={`delta ${s.change > 0 ? "up" : s.change < 0 ? "down" : ""}`}>{signed(s.change)}</span>
          </button>
        ))}
      </div>

      <Panel>
        <div className="panel-head">
          <h3>{skill.name} skill score over time</h3>
          <Chip>Target {progress.target_score}%</Chip>
        </div>

        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 12, right: 24, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id={gapId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: "var(--ink)", stopOpacity: 0.16 }} />
                  <stop offset="100%" style={{ stopColor: "var(--ink)", stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--dim)" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis domain={[0, 100]} stroke="var(--dim)" tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--ink)", strokeDasharray: "4 4" }} />
              <ReferenceLine
                y={progress.target_score}
                stroke="var(--warn)"
                strokeDasharray="5 5"
                label={{ value: `Target ${progress.target_score}%`, fill: "var(--warn)", fontSize: 12, position: "insideTopRight" }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="var(--ink)"
                strokeWidth={2.5}
                fill={`url(#${gapId})`}
                dot={{ r: 5, fill: "var(--surface)", stroke: "var(--ink)", strokeWidth: 2 }}
                activeDot={{ r: 7, fill: "var(--ink)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {skill.events.length === 1 && (
          <p className="dim">
            This is only your starting point. Take the assessment or finish a practice question to draw the line.
          </p>
        )}
      </Panel>

      <Panel>
        <div className="panel-head">
          <h3>{skill.name} journey</h3>
        </div>

        <ol className="journey">
          {skill.events.map((e, i) => (
            <li key={`${e.label}-${i}`} className="journey-item done">
              <span className="j-dot" />
              <div>
                <strong>
                  {e.label}: {e.score}%
                </strong>
                <span className="dim">
                  {e.note} at {e.time}
                </span>
              </div>
            </li>
          ))}

          {lastInterview && (
            <li className="journey-item gap">
              <span className="j-dot" />
              <div>
                <strong>New skill gap: {lastInterview.gap.title}</strong>
                <span className="dim">{lastInterview.gap.reason}</span>
              </div>
            </li>
          )}

          {action && (
            <li className="journey-item next">
              <span className="j-dot" />
              <div>
                <strong>Next best action: {action.action}</strong>
                <span className="dim">{action.why}</span>
              </div>
            </li>
          )}
        </ol>

        {action && (
          <button className="btn btn-primary" onClick={() => setPage(action.route)}>
            {ROUTE_LABEL[action.route] || "Start"}
            <ArrowRight size={17} />
          </button>
        )}
      </Panel>

      <Panel>
        <div className="panel-head">
          <h3>Interview history</h3>
        </div>
        {progress.interviews.length === 0 ? (
          <p className="dim">No interviews yet. Finish one and its result will be logged here.</p>
        ) : (
          <div className="log">
            {[...progress.interviews].reverse().map((i, idx) => (
              <div className="log-row" key={idx}>
                <Chip tone="ice">{i.skill}</Chip>
                <span className="log-q">{i.question}</span>
                <span className="log-gap">Gap: {i.gap.title}</span>
                <Chip tone={toneFor(i.score)}>{i.score}%</Chip>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Login / signup                                                      */
/* ------------------------------------------------------------------ */

function AuthScreen({ onAuth, theme, onToggleTheme }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", goal: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const signup = mode === "signup";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = signup
        ? await post("/auth/signup", form)
        : await post("/auth/login", { email: form.email, password: form.password });
      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <ThemeToggle theme={theme} onToggle={onToggleTheme} className="auth-theme" />

      <div className="auth-pitch">
        <div className="brand static">
          <span className="logo-mark">
            <Compass size={22} />
          </span>
          <span>
            <strong>Career Compass</strong>
            <em>AI career coach</em>
          </span>
        </div>

        <h1 className="hero-title">Know your skills. Prove your growth.</h1>
        <p className="hero-sub">
          Software, government jobs, civil services, engineering, teaching or something else. Tell us your goal and
          you get a skill gap, a personal roadmap, adaptive practice and an AI mock interview built for it.
        </p>

        <ul className="auth-points">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <li key={p.title}>
                <span className="pillar-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{p.title}</strong>
                  <span>{p.text}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <Panel className="auth-card">
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!signup}
            className={`tab ${!signup ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={signup}
            className={`tab ${signup ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            Create account
          </button>
        </div>

        <h2 className="auth-title">{signup ? "Start your journey" : "Welcome back"}</h2>

        <form className="auth-form" onSubmit={submit}>
          {signup && (
            <label className="field">
              <span>Your name</span>
              <input value={form.name} onChange={set("name")} placeholder="Rahul" autoComplete="name" required />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="you@college.edu"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder={signup ? "At least 6 characters" : "Your password"}
              autoComplete={signup ? "new-password" : "current-password"}
              required
            />
          </label>

          {signup && (
            <label className="field">
              <span>Career goal</span>
              <input
                value={form.goal}
                onChange={set("goal")}
                list="goal-options"
                placeholder="For example: UPSC Civil Services"
                required
              />
              <datalist id="goal-options">
                {GOAL_OPTIONS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <small>Type any goal. We build the skills, questions and coach around it.</small>
            </label>
          )}

          {error && <Notice title={signup ? "Could not create your account" : "Could not log in"}>{error}</Notice>}

          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
            {busy ? (signup ? "Setting up your profile" : "Please wait") : signup ? "Create my account" : "Log in"}
            <ArrowRight size={18} />
          </button>
        </form>

        <p className="dim auth-switch">
          {signup ? "Already have an account?" : "New to Career Compass?"}{" "}
          <button
            type="button"
            className="link"
            onClick={() => {
              setMode(signup ? "login" : "signup");
              setError("");
            }}
          >
            {signup ? "Log in" : "Create an account"}
          </button>
        </p>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI roadmap                                                          */
/* ------------------------------------------------------------------ */

function Roadmap({ roadmap, loading, error, loadRoadmap, skills, setPage }) {
  const bySkill = Object.fromEntries(skills.map((s) => [s.name, s]));
  const target = roadmap?.target_score || 70;

  return (
    <div className="stack">
      {error && <Notice title="The roadmap could not load">{error}</Notice>}
      {loading && !roadmap && <Loader text="Llama 3 is building your roadmap" />}

      {roadmap && (
        <>
          <Panel className="glow-border">
            <div className="panel-head">
              <div>
                <h2 className="section-title">Roadmap to {roadmap.goal}</h2>
                <p className="dim">
                  Target: {roadmap.target_score}% in every skill. Estimated timeline: {roadmap.estimated_timeline}.
                </p>
              </div>
              <div className="btn-row">
                <Chip tone={roadmap.engine === "llama3" ? "ice" : "warn"} icon={<Cpu size={13} />}>
                  {roadmap.engine === "llama3" ? "Built by Llama 3" : "Offline roadmap"}
                </Chip>
                <button className="btn btn-ghost" onClick={() => loadRoadmap(true)} disabled={loading}>
                  <RefreshCw size={15} className={loading ? "spin" : ""} />
                  Rebuild roadmap
                </button>
              </div>
            </div>
            <p className="lead">{roadmap.overview}</p>
          </Panel>

          <ol className="roadmap">
            {roadmap.milestones.map((m) => {
              const s = bySkill[m.skill];
              const score = s ? s.score : 0;
              const gap = Math.max(target - score, 0);
              return (
                <li className="milestone" key={m.order}>
                  <span className="milestone-num">{m.order}</span>
                  <Panel className="milestone-card">
                    <div className="panel-head">
                      <div className="chip-row">
                        <Chip tone="ice">{m.skill}</Chip>
                        <Chip>{m.duration}</Chip>
                      </div>
                    </div>
                    <h3>{m.title}</h3>
                    <p className="dim">{m.description}</p>

                    {s && (
                      <div className={`mini tone-${toneFor(score)}`}>
                        <div className="mini-bar">
                          <div className="mini-fill" style={{ width: `${score}%` }} />
                          <div className="mini-target" style={{ left: `${target}%` }} />
                        </div>
                        <span>
                          {m.skill} now at {score}%. {gap > 0 ? `${gap} points to the target.` : "Target reached."}
                        </span>
                      </div>
                    )}

                    {m.resources?.length > 0 && (
                      <div className="milestone-resources">
                        <h4>Resources</h4>
                        <ResourceGrid resources={m.resources} />
                      </div>
                    )}
                  </Panel>
                </li>
              );
            })}
          </ol>

          <div className="btn-row">
            <button className="btn btn-primary btn-lg" onClick={() => setPage("practice")}>
              Start practising
              <ArrowRight size={18} />
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => setPage("gap")}>
              See my skill gap
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App shell: journey navigation                                       */
/* ------------------------------------------------------------------ */

const STEPS = [
  { id: "assessment", label: "Assessment", sub: "Measure your skills" },
  { id: "gap", label: "Skill gap", sub: "Find what to fix" },
  { id: "practice", label: "Practice", sub: "Improve and verify" },
  { id: "interview", label: "Mock interview", sub: "AI evaluation" },
  { id: "progress", label: "Progress", sub: "See your journey" },
];

const PAGE_META = {
  home: null,
  assessment: { title: "Skill assessment", sub: "Answer every question. Your scores set the starting point." },
  gap: { title: "Your skill gap and next best action", sub: "See how far each skill is from the target, and the one thing to do next." },
  practice: { title: "Practice that adapts to you", sub: "Difficulty follows your score. Every correct answer is verified into your profile." },
  interview: { title: "AI mock interview", sub: "Explain your answer like a real interview. Llama 3 finds your next weakness." },
  progress: { title: "Your progress", sub: "Every point here comes from something you did." },
  roadmap: { title: "Your AI roadmap", sub: "A milestone plan built from your goal and your current scores." },
  coach: { title: "AI coach", sub: "Advice built from your goal and results. Ask it anything else too." },
};

function stepIndex(id) {
  return STEPS.findIndex((s) => s.id === id);
}

function recommendPage({ plan, progress, nextAction, seen }) {
  if (!plan || !progress) return "assessment";
  const hasAssessment = progress.skills.some((s) => s.events.some((e) => e.stage === "Assessment"));
  switch (plan.phase) {
    case "assess":
      return "assessment";
    case "practice":
      return hasAssessment && !seen.gap ? "gap" : "practice";
    case "interview":
      return "interview";
    default:
      return nextAction?.route || "practice";
  }
}

function DirectionBar({ page, next, nextAction, gapInfo, go }) {
  const here = page === next.page;
  const messages = {
    assessment: "Start here. Take the assessment so we can find your skill gaps.",
    gap: "Assessment done. See your skill gap and your next best action.",
    practice: nextAction ? `Next: ${nextAction.action}. ${nextAction.why}` : "Practice at your level.",
    interview: nextAction?.route === "interview"
      ? "Your practice improvement is verified. Now test yourself in the AI mock interview."
      : "Take the AI mock interview.",
  };
  let text = messages[next.page] || "";
  if (next.page === "practice" && gapInfo && nextAction?.source === "interview") {
    text = `New gap found: ${gapInfo.title}. Next: ${nextAction.action}.`;
  }

  return (
    <div className={`direction ${here ? "here" : ""}`}>
      <div className="direction-icon">
        <Compass size={20} />
      </div>
      <div className="direction-text">
        <strong>{here ? "You are on the right step" : `Your next step: ${next.label}`}</strong>
        <span>{text}</span>
      </div>
      {!here && (
        <button className="btn btn-primary" onClick={() => go(next.page)}>
          Go to {next.label}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [page, setPage] = useState("home");
  const [backend, setBackend] = useState("checking");
  const [profile, setProfile] = useState({ name: "Student", goal: "Software Developer", target_score: 70 });
  const [seen, setSeen] = useState({ gap: false, progress: false });
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [roadmap, setRoadmap] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState("");

  const [skills, setSkills] = useState([]);
  const [skillGap, setSkillGap] = useState(null);
  const [nextAction, setNextAction] = useState(null);
  const [plan, setPlan] = useState(null);
  const [progress, setProgress] = useState(null);

  const [assessment, setAssessment] = useState(null);
  const [assessmentError, setAssessmentError] = useState("");
  const [assessmentResult, setAssessmentResult] = useState(null);
  const assessReq = useRef(0);

  const [practice, setPractice] = useState(null);
  const [practiceError, setPracticeError] = useState("");
  const [practiceResult, setPracticeResult] = useState(null);
  const [practiceDraft, setPracticeDraft] = useState("");

  const [interview, setInterview] = useState(null);
  const [interviewError, setInterviewError] = useState("");
  const [interviewResult, setInterviewResult] = useState(null);
  const [interviewDraft, setInterviewDraft] = useState("");

  const [coach, setCoach] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");
  const [coachMessages, setCoachMessages] = useState([]);

  const refreshCore = useCallback(async () => {
    try {
      const [s, g, a, p, pr] = await Promise.all([
        api("/skills"),
        api("/skill-gap"),
        api("/next-action"),
        api("/agent/plan"),
        api("/progress"),
      ]);
      setSkills(s.skills);
      setSkillGap(g);
      setNextAction(a);
      setPlan(p);
      setProgress(pr);
      setBackend("online");
    } catch (e) {
      console.error("Refresh error:", e);
      setBackend("offline");
    }
  }, []);

  // Skills without a built-in bank get their questions written by Llama 3,
  // so this call can be slow the first time. A counter drops stale replies.
  const loadAssessment = useCallback(async () => {
    const id = ++assessReq.current;
    setAssessmentError("");
    try {
      const data = await api("/assessment");
      if (id === assessReq.current) setAssessment(data);
    } catch (e) {
      if (id === assessReq.current) setAssessmentError(e.message);
    }
  }, []);

  const loadPractice = useCallback(async (reset = false) => {
    if (reset) setPractice(null);
    setPracticeError("");
    try {
      setPractice(await api("/practice"));
    } catch (e) {
      setPracticeError(e.message);
    }
  }, []);

  const loadInterview = useCallback(async (reset = false) => {
    if (reset) setInterview(null);
    setInterviewError("");
    try {
      setInterview(await api("/interview"));
    } catch (e) {
      setInterviewError(e.message);
    }
  }, []);

  const loadCoach = useCallback(async (force = false) => {
    setCoachLoading(true);
    setCoachError("");
    try {
      setCoach(await api(`/coach?refresh=${force}`));
    } catch (e) {
      setCoachError(e.message);
    } finally {
      setCoachLoading(false);
    }
  }, []);

  const loadRoadmap = useCallback(async (force = false) => {
    setRoadmapLoading(true);
    setRoadmapError("");
    try {
      setRoadmap(await api(`/roadmap?refresh=${force}`));
    } catch (e) {
      setRoadmapError(e.message);
    } finally {
      setRoadmapLoading(false);
    }
  }, []);

  // Restore an existing session after a page refresh.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthChecked(true);
      return;
    }
    api(`/auth/me?token=${encodeURIComponent(token)}`)
      .then((d) => {
        setUser(d.user);
        setProfile(d.user);
      })
      .catch(() => setToken(null))
      .finally(() => setAuthChecked(true));
  }, []);

  // Load the student's data once someone is logged in.
  useEffect(() => {
    if (!user) return;
    loadAssessment();
    refreshCore();
  }, [user, refreshCore, loadAssessment]);

  useEffect(() => {
    if (page === "practice" && !practiceResult) loadPractice();
    if (page === "interview" && !interviewResult) loadInterview();
    if (page === "coach") loadCoach(false);
    if (page === "roadmap") loadRoadmap(false);
    if (page === "gap") setSeen((s) => ({ ...s, gap: true }));
    if (page === "progress") setSeen((s) => ({ ...s, progress: true }));
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // A new assessment or interview makes any old practice result stale.
  const clearPractice = () => {
    setPracticeResult(null);
    setPracticeDraft("");
    setPractice(null);
  };

  const handleAssessmentResult = (result) => {
    setAssessmentResult(result);
    setSeen((s) => ({ ...s, gap: false }));
    clearPractice();
    setInterviewResult(null);
    setInterviewDraft("");
    setInterview(null);
  };

  const handleInterviewResult = (result) => {
    setInterviewResult(result);
    if (result) clearPractice();
  };

  // Everything the browser remembers about the previous student or goal.
  const resetLocal = () => {
    assessReq.current += 1; // ignore any assessment reply still on its way
    setAssessment(null);
    setAssessmentError("");
    setAssessmentResult(null);
    setPracticeResult(null);
    setInterviewResult(null);
    setPracticeDraft("");
    setInterviewDraft("");
    setPractice(null);
    setPracticeError("");
    setInterview(null);
    setInterviewError("");
    setCoach(null);
    setCoachMessages([]);
    setRoadmap(null);
    setSeen({ gap: false, progress: false });
    setSkills([]);
    setSkillGap(null);
    setNextAction(null);
    setPlan(null);
    setProgress(null);
  };

  const enterApp = (data) => {
    setToken(data.token);
    resetLocal();
    setProfile(data.user);
    setUser(data.user);
    setPage("home");
  };

  const changeGoal = async (goal) => {
    const data = await post("/profile/goal", { goal });
    resetLocal();
    setProfile(data.user);
    setUser(data.user); // new object: the effect above reloads everything for the new goal
  };

  const logout = async () => {
    const token = getToken();
    try {
      if (token) await post(`/auth/logout?token=${encodeURIComponent(token)}`);
    } catch {
      /* logging out locally is enough */
    }
    setToken(null);
    resetLocal();
    setUser(null);
    setPage("home");
  };

  const resetDemo = async () => {
    if (!window.confirm("Reset all scores and progress back to the starting profile?")) return;
    try {
      await post("/reset");
      resetLocal();
      await refreshCore();
      loadAssessment();
      setPage("home");
    } catch (e) {
      console.error(e);
    }
  };

  if (!authChecked) {
    return (
      <div className="boot">
        <Loader text="Loading Career Compass" />
      </div>
    );
  }

  if (!user) return <AuthScreen onAuth={enterApp} theme={theme} onToggleTheme={toggleTheme} />;

  const nextId = recommendPage({ plan, progress, nextAction, seen });
  const nextStep = STEPS[stepIndex(nextId)] || STEPS[0];
  const next = { page: nextStep.id, label: nextStep.label };

  const hasAssessment = !!progress?.skills.some((s) => s.events.some((e) => e.stage === "Assessment"));
  const done = {
    assessment: hasAssessment,
    gap: seen.gap && hasAssessment,
    practice: plan?.phase === "interview" || plan?.phase === "repeat",
    interview: (progress?.interviews.length || 0) > 0,
    progress: seen.progress && (progress?.interviews.length || 0) > 0,
  };

  const meta = PAGE_META[page];
  const stepNo = stepIndex(page) + 1;

  return (
    <div className="app">
      <header className="topnav">
        <button className="brand" onClick={() => setPage("home")} aria-label="Career Compass home">
          <span className="logo-mark">
            <Compass size={22} />
          </span>
          <span>
            <strong>Career Compass</strong>
            <em>AI career coach</em>
          </span>
        </button>

        <nav className="stepper" aria-label="Your journey">
          {STEPS.map((step, i) => (
            <div className="step-wrap" key={step.id}>
              <button
                className={`step ${page === step.id ? "active" : ""} ${done[step.id] ? "done" : ""} ${
                  nextId === step.id && page !== step.id ? "next" : ""
                }`}
                onClick={() => setPage(step.id)}
                aria-current={page === step.id ? "page" : undefined}
              >
                <span className="step-num">{done[step.id] ? <Check size={16} strokeWidth={3} /> : i + 1}</span>
                <span className="step-text">
                  <strong>{step.label}</strong>
                  <em>{step.sub}</em>
                </span>
              </button>
              {i < STEPS.length - 1 && <span className={`step-link ${done[step.id] ? "done" : ""}`} />}
            </div>
          ))}
        </nav>

        <div className="top-actions">
          <button className={`coach-btn ${page === "roadmap" ? "active" : ""}`} onClick={() => setPage("roadmap")}>
            <Flag size={16} />
            <span className="lbl">Roadmap</span>
          </button>
          <button className={`coach-btn ${page === "coach" ? "active" : ""}`} onClick={() => setPage("coach")}>
            <MessageSquare size={16} />
            <span className="lbl">AI Coach</span>
          </button>
          <div className="user-chip" title={backend === "online" ? "Backend online" : "Backend offline"}>
            <span className={`dot ${backend}`} />
            <span className="avatar sm">{profile.name.charAt(0)}</span>
            <strong>{profile.name}</strong>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button className="icon-btn reset-btn" onClick={resetDemo} title="Reset my progress" aria-label="Reset my progress">
            <RotateCcw size={16} />
          </button>
          <button className="icon-btn" onClick={logout} title="Log out" aria-label="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="main">
        {backend === "offline" && (
          <Notice title="Cannot reach the backend">
            Start it from the backend folder with: uvicorn main:app --reload. Then refresh this page.
          </Notice>
        )}

        {page !== "home" && (
          <DirectionBar page={page} next={next} nextAction={nextAction} gapInfo={progress?.latest_gap} go={setPage} />
        )}

        {meta && (
          <div className="page-head">
            <Chip tone="ice">{stepNo > 0 ? `Step ${stepNo} of ${STEPS.length}` : "Available any time"}</Chip>
            <h1>{meta.title}</h1>
            <p>{meta.sub}</p>
          </div>
        )}

        {page === "home" && (
          <Home
            profile={profile}
            skills={skills}
            plan={plan}
            next={next}
            go={setPage}
            setPage={setPage}
            assessed={hasAssessment}
            onChangeGoal={changeGoal}
          />
        )}

        {page === "assessment" && (
          <Assessment
            assessment={assessment}
            loadError={assessmentError}
            loadAssessment={loadAssessment}
            result={assessmentResult}
            setResult={handleAssessmentResult}
            refreshCore={refreshCore}
            setPage={setPage}
          />
        )}

        {page === "gap" && (
          <SkillGap
            skills={skills}
            skillGap={skillGap}
            nextAction={nextAction}
            progress={progress}
            setPage={setPage}
            goal={profile.goal}
            assessed={hasAssessment}
          />
        )}

        {page === "practice" && (
          <Practice
            practice={practice}
            loadError={practiceError}
            result={practiceResult}
            setResult={setPracticeResult}
            draft={practiceDraft}
            setDraft={setPracticeDraft}
            loadPractice={loadPractice}
            refreshCore={refreshCore}
            setPage={setPage}
          />
        )}

        {page === "interview" && (
          <MockInterview
            interview={interview}
            loadError={interviewError}
            result={interviewResult}
            setResult={handleInterviewResult}
            draft={interviewDraft}
            setDraft={setInterviewDraft}
            loadInterview={loadInterview}
            refreshCore={refreshCore}
            setPage={setPage}
          />
        )}

        {page === "progress" && <Progress progress={progress} setPage={setPage} />}

        {page === "roadmap" && (
          <Roadmap
            roadmap={roadmap}
            loading={roadmapLoading}
            error={roadmapError}
            loadRoadmap={loadRoadmap}
            skills={skills}
            setPage={setPage}
          />
        )}

        {page === "coach" && (
          <Coach
            coach={coach}
            loading={coachLoading}
            error={coachError}
            loadCoach={loadCoach}
            messages={coachMessages}
            setMessages={setCoachMessages}
            goal={profile.goal}
          />
        )}
      </main>
    </div>
  );
}
