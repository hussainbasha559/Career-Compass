# Career Compass — AI Career Intelligence & Skill Improvement Platform

Career Compass measures a student's skills for any career goal, finds the
biggest gap, recommends the next best action, verifies improvement through
AI-graded practice, and checks real understanding with an AI mock interview —
then repeats the loop with a new weakness.

Stack: **React** (frontend) · **FastAPI / Python** (backend) · **MySQL**
(persistent data) · **Ollama + Llama 3** (all AI evaluation, running locally).

---

## 1. What's in this update

This pass adds AI-graded practice, a full assessment review, and
career-goal-aware learning resources — without touching auth, MySQL wiring,
career-goal selection, or assessment scoring, which already worked.

| Area | Before | Now |
|---|---|---|
| Assessment result | Percentage only | Per-question review: your answer vs. correct answer, ✅/❌, explanation, plus skill-wise and overall score summary |
| Practice grading | Keyword/string match | Ollama (Llama 3) judges meaning: `correct` / `partially_correct` / `incorrect`, with explanation, missing concepts, correct answer, and an improvement tip |
| Practice history | Not stored | Saved to MySQL per logged-in user (`practice_history`) |
| Roadmap | Learning plan only | Each milestone also lists curated resources (docs, tutorials, practice sites) matched to the career goal and skill |
| Next Best Action | Action + why | Also carries the matching resources |
| Ollama failures | Could crash or silently degrade | Returns a clear "AI evaluation is temporarily unavailable" message; no crash |
| Loading state | Basic "Checking" button | "🤖 AI is evaluating your answer..." with rotating status text; submit button disabled while evaluating |

---

## 2. Files changed

- `main.py` — backend (FastAPI)
- `App.jsx` — frontend (React)
- `App.css` — styling (two additive blocks: assessment review + resource cards; everything else reused from the existing design system)
- Database — one new table, `practice_history` (see §4)

No existing file was rewritten from scratch. No existing route, table, or
component was removed.

---

## 3. Backend changes (`main.py`)

- **`evaluate_practice_with_ollama()`** — new helper that sends the question,
  the student's answer, and the expected answer to Ollama with a structured
  prompt, and parses back:
  ```json
  {
    "result": "correct | partially_correct | incorrect",
    "score": 0-100,
    "correct_answer": "...",
    "explanation": "...",
    "missing_concepts": ["..."],
    "improvement_tip": "..."
  }
  ```
  Every practice answer — built-in bank questions and Llama-3-generated
  questions alike — now goes through this helper. No string/keyword
  comparison decides correctness anymore.
- **`POST /practice/evaluate`** — returns the structured evaluation above
  instead of a plain `correct: true/false`. Requires `token` in the request
  body and resolves `user_id` server-side via the existing session lookup —
  never trusts a `user_id` sent from the frontend.
- **`POST /practice/improvement`** — unchanged in purpose (still updates the
  skill score), now also writes a `practice_history` row.
- **`POST /assessment/evaluate`** — in addition to `scores`, now returns
  `results`: a per-skill list of `{question, user_answer, correct_answer,
  is_correct, explanation}` for every question, so the frontend can render a
  full review. Correct answers are still never sent before submission.
- **`RESOURCES`** — new curated dictionary (skill → list of
  `{title, type, url, description}`), keyed by both skill and career goal, so
  a Data Analyst and a Software Developer get different resources for
  "Python." No URLs are invented — only real, hand-curated links.
- **`build_next_action()`** and **`get_roadmap()` / `offline_roadmap()`** —
  now attach the matching `resources` list to each next-action and each
  roadmap milestone.
- **Ollama failure handling** — if Ollama is unreachable or returns invalid
  JSON, the practice endpoint raises a clean `503` with the message *"AI
  evaluation is temporarily unavailable. Please make sure Ollama is
  running."* instead of crashing or silently falling back to a keyword
  guess.

---

## 4. Database changes (MySQL)

One additive table (existing tables — `users`, `skill_scores`,
`assessment_history` — are untouched):

```sql
CREATE TABLE practice_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    skill VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    user_answer TEXT,
    correct_answer TEXT,
    ai_evaluation TEXT,
    score INT,
    result VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

Every row is scoped to `user_id`, resolved from the session token — one
student can never see or write another student's practice history.

---

## 5. Frontend changes (`App.jsx`)

- **`Assessment`** — after submitting, shows a score-chip summary (Correct
  X/Y, Wrong X/Y, Overall %) and a "Review my answers" toggle that opens a
  per-question breakdown (`AssessmentReview`) with ✅/❌ styling and the
  explanation for each question.
- **`Practice`** — the result panel now branches on
  `correct` / `partially_correct` / `incorrect`, each with its own icon,
  color, and fields (correct answer, why, what you missed, what you got
  right, improvement tip). Submissions are blocked while an evaluation is in
  flight, and the loading state cycles through "AI is evaluating your
  answer..." style messages. Both practice calls now send the session
  `token`.
- **`SkillGap`** (next best action) and **`Roadmap`** — render a new
  `ResourceGrid` / `ResourceCard` component for the resources returned by the
  backend, opening every link in a new tab.
- **`MockInterview`** — the "next best action" card at the end of an
  interview also now shows resources, reusing the same `ResourceGrid`.

No page, route, or existing prop contract was removed — only extended.

---

## 6. UI/UX

- Reused the existing design tokens (`--good`, `--warn`, `--bad`, card and
  chip patterns already in `App.css`) so new pieces match the current
  Career Compass look rather than introducing a new style.
- Two additive CSS blocks: assessment review rows (already partially present
  in the file as `.review-*` / `.score-chip-row`, now actually used) and a
  new `.resource-card` / `.resource-grid` block for roadmap and next-action
  resources.
- Loading, error, and empty states follow the same `Loader` / `Notice`
  components already used across the app.

---

## 7. How to test each feature

1. **Assessment review** — log in, take the assessment, submit. Confirm the
   score-chip row (Correct/Wrong/Overall) appears, then click "Review my
   answers" and confirm each question shows your answer, the correct answer
   only for wrong ones, and an explanation.
2. **AI-graded practice** — go to Practice, submit a clearly correct answer,
   a vague/partial one, and a wrong one. Confirm you get three different
   result cards (✅ Correct, 🟡 Partially Correct, ❌ Incorrect) with the
   fields described above, and that the score/skill bar still updates.
3. **Practice history in MySQL** — after a few practice submissions, query
   `practice_history` and confirm rows exist, scoped to the logged-in
   `user_id`, and that a second test account never sees the first account's
   rows.
4. **Ollama offline handling** — stop Ollama (`ollama serve` off) and submit
   a practice answer. Confirm you see "AI evaluation is temporarily
   unavailable. Please make sure Ollama is running." instead of a crash or a
   silent wrong grade.
5. **Roadmap resources** — open Roadmap, confirm each milestone lists
   resources relevant to your career goal (e.g. Data Analyst gets Excel/SQL
   resources, Software Developer gets DSA/System Design resources), and that
   clicking a resource opens it in a new tab.
6. **Next Best Action resources** — from the Skill Gap page, confirm the
   "next best action" panel also shows matching resources.
7. **Regression check** — confirm login/signup, career-goal selection,
   assessment scoring, skill-gap calculation, and the mock interview all
   still work exactly as before.

---

## 8. Running the project

```bash
# Backend
pip install fastapi uvicorn ollama pydantic mysql-connector-python argon2-cffi slowapi
ollama pull llama3
ollama serve
uvicorn main:app --reload

# Frontend
npm install
npm run dev
```

MySQL must be running locally with a `career_compass` database and the
schema above (plus the pre-existing `users`, `skill_scores`,
`assessment_history` tables).
