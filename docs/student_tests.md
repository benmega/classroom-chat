# Student Tests

Multiple-choice tests that students take in the app. Three tests ship with the code (Computer Science, grades 3-5, 6-8 and 9-11; 30 questions each, many with a diagram). Their content lives in JSON files and is loaded by `flask seed`; admins control how each test behaves from the app.

## 1. Overview

| Role | Where | What |
|-|-|-|
| Student (and admin) | `/tests` (nav rail "Tests", mobile sidebar) | List of active tests with question count, time limit and past scores; Start, Resume or Retake |
| Student (and admin) | `/tests/:slug` | Take the test |
| Student | `/tests/results/:attemptId` | Own result, with the review when "Answers shown" is on |
| Parent | `/parent/report/:studentId` | "Tests" section of the child's report card (hidden when the child has no attempts); result at `/parent/tests/results/:attemptId` |
| Admin | `/admin/tests` | Settings per test, results table, CSV export, delete |
| Admin | `/admin/users/:userId` | "Tests" table on a student's page; result at `/admin/tests/results/:attemptId` |

- Parents cannot take tests (`403`); a parent who opens `/tests` is redirected to the parent dashboard.
- Results are only returned by the `/api/quizzes` endpoints. They are not on the public profile, in the chat, in the activity feed, in course progress or in the user objects. Tests in `test_quiz_routes.py` assert this.
- The result page, `QuizResultView`, shows score, correct/wrong/skipped, a per-domain table, the duck reward and (when allowed) the question review with an All/Incorrect/Correct filter.

## 2. Taking a test

- **Start**: `POST /api/quizzes/<slug>/attempts` creates an attempt, or returns the one already open (one open attempt per student per test, held by a partial unique index). Reopening the test resumes it with its saved answers, flags and elapsed time. A test that an admin has made inactive cannot be started or resumed (`404`).
- **Questions**: one at a time with Prev / Next, a Flag toggle and a numbered palette that shows answered and flagged questions. Options are radio buttons. A question may carry a diagram (section 10).
- **Autosave**: `PATCH /api/quizzes/attempts/<id>` with the whole `answers` map, the `flagged` list and `elapsed_seconds`. It is sent
    - 800 ms after the last change (debounced),
    - every 15 s (keeps the elapsed time current),
    - when the page is hidden (`visibilitychange`) or closed (`pagehide`), and when the page is left with unsaved changes.

  One save is in flight at a time; a change made meanwhile is sent after it. The header shows Saving / Saved / Not saved. A failed save is retried by the next trigger.
- **Clock**: without a time limit it counts up from the elapsed time the server holds (the attempt never expires). With a limit it counts down to the attempt's `deadline` and turns red in the last 60 s. At zero the page submits by itself; a failed automatic submit is retried once after 5 s.
- **Deadline**: fixed when the attempt starts, `started_at` plus the test's time limit at that moment. Changing or removing the limit later does not reach an attempt already open. The deadline is wall-clock: time spent away from the page counts against it, while `elapsed_seconds` only counts time on the page.
- **Grace period**: a save or submit up to 30 s past the deadline (`GRACE_SECONDS`) still counts. Later, a save answers `409` with `expired: true`, and a submit grades the answers already saved and ignores its body.
- **Submit**: the Submit button asks for confirmation ("N unanswered" / "All answered"), then `POST /api/quizzes/attempts/<id>/submit` with the current progress. The page then opens the result and refreshes the user so the duck balance is current.
- **Retakes**: with "Retakes" off, a student with a submitted attempt gets `403` on start. With it on, each start after a submit makes a new attempt; earlier results stay.
- `elapsed_seconds` only grows: a lower value than the stored one is ignored. Accepted range is 0 to 86400.

## 3. Grading

- Grading is server-side only. While an attempt is open the API sends questions without `answer` or `explanation` (`serialize_question`); the key appears only in a Result.
- Submitting is one conditional `UPDATE ... WHERE submitted_at IS NULL` that stores the final answers, the graded snapshot and the score together. Of two racing submits one wins (the other gets `409`), and a save racing a submit cannot change graded answers.
- **Graded snapshot**: at submit, `quiz_attempts.graded` stores `{"<number>": {"answer", "selected", "domain"}}` for every question. Results are always read from it, so editing the key, adding questions or deleting questions later does not change an old score, counts or domain breakdown. Question text (prompt, options, explanation, diagram) is read live; a question deleted since still counts but is left out of the review.
- Score: `correct_count`, `total_count`, `score_percent` (whole number, halves rounded up). An unanswered question is "skipped" and counts as not correct.

## 4. Review visibility

| Viewer | Score and domains | Review (key, explanations, diagrams) |
|-|-|-|
| Owner | always | only when the test's "Answers shown" is on |
| Admin | always | always |
| Linked parent | always | always |
| Another student, unlinked parent | `403` | `403` |

The same rule decides the body of the submit response. While an attempt is open, the owner gets the attempt state, and an admin or linked parent gets a summary (`status: in_progress`, no answers).

## 5. Duck reward

- The first submitted attempt of a student on a test pays 1 duck per correct answer (`award_ducks`). Retakes pay nothing.
- No perk multiplier applies (the "Permanent Double Duck" perk does not touch it).
- Students only: admins and parents are not paid.
- `quiz_rewards` (unique on `user_id, quiz_id`) is written in the same transaction as the first submit, even when 0 ducks are earned. It outlives the attempt, so deleting the attempt for a retake does not make the ducks payable again, and two racing submits pay once.
- The credit is a `DuckTransaction` with reason `Test: <slug>`; `quiz_attempts.ducks_awarded` holds the amount (0 on retakes) and the result page shows it.

## 6. Admin settings

`/admin/tests`, one row per test (inactive tests included). A change saves at once and is reverted on failure.

| Setting | Column | Effect |
|-|-|-|
| Active | `is_active` | Off: hidden from students, cannot be started or resumed; existing results stay readable |
| Answers shown | `reveal_answers` | Off: the owner sees score and domains but no review (section 4) |
| Retakes | `allow_retakes` | Off: one submitted attempt per student |
| Time limit (min) | `time_limit_minutes` | Empty (none) or a whole number 1-600; read when an attempt starts |

The seed never overwrites these (section 9). The API (`PATCH /api/quizzes/admin/<slug>`) accepts only these four fields and rejects wrong types with `400`.

**Results table**: student (link to `/admin/users/:id`), test, score (link to the result), %, time, submitted date or "In progress", and a delete button. Filters: test and status (All / Submitted / In progress). The API returns the 500 newest attempts (`RESULTS_LIMIT`) and also takes `classroom_id`, which the page does not use.

**CSV**: the button exports the rows currently shown (so the filters apply) as `test_results.csv` with the columns Student, Username, Test, Correct, Total, Percent, Seconds, Submitted. It uses Papa Parse with `escapeFormulae: true`, which prefixes a cell starting with `=`, `+`, `-` or `@` so a spreadsheet does not run it.

**Delete**: removes the attempt (submitted or in progress) after a confirmation. The student can then start the test again, even with retakes off, because no submitted attempt is left. The duck reward is not paid again (section 5).

## 7. Data model

Models in `backend/application/models/quiz.py`; migration `4c9a7e2b51d3_student_tests.py` (revises `183122a091ad`; creates only missing tables, so it is safe to rerun). The migration creates the tables and the seed fills them.

| Table | Key columns |
|-|-|
| `quizzes` | `slug` (unique), `title`, `description`, `source_url`, `sort_order`; settings `is_active`, `reveal_answers`, `allow_retakes`, `time_limit_minutes`; `created_at`, `updated_at` |
| `quiz_questions` | `quiz_id` (FK, cascade), `number` (unique with `quiz_id`), `domain`, `prompt`, `options` (JSON `{"A": "text"}`), `answer` (one letter), `explanation`, `diagram_html` |
| `quiz_attempts` | `quiz_id`, `user_id` (FKs, cascade), `answers` (JSON `{"<number>": "<letter>"}`), `flagged` (JSON list of numbers), `started_at`, `deadline`, `submitted_at` (null while open), `elapsed_seconds`, `correct_count`, `total_count`, `score_percent`, `graded` (snapshot), `ducks_awarded`; partial unique index `uq_quiz_attempts_one_open_per_user_quiz` on `(user_id, quiz_id)` where `submitted_at IS NULL` |
| `quiz_rewards` | `user_id`, `quiz_id` (FKs, cascade), `ducks`, `created_at`; unique `(user_id, quiz_id)` |

Deleting a quiz deletes its questions, attempts and rewards; deleting a user deletes their attempts and rewards (`User.quiz_attempts`, `User.quiz_rewards`).

## 8. API

Blueprint `quiz_bp` (`backend/application/routes/quiz_routes.py`), prefix `/api/quizzes`, all behind a login; logic in `backend/application/services/quiz_service.py`; client in `frontend/src/api/quizzes.js`. Responses use the standard envelope (`api_response`).

| Endpoint | Role | Purpose |
|-|-|-|
| `GET /api/quizzes` | any logged in | Active tests with the caller's attempts, `in_progress_attempt_id` and `can_start` (false for parents, and when retakes are off after a submit) |
| `POST /api/quizzes/<slug>/attempts` | student, admin | Start or resume; `201` for a new attempt, `200` for a resumed one. `403` for parents or when retakes are off; `404` for an unknown or inactive test. 30/min |
| `GET /api/quizzes/attempts/<id>` | owner, admin, linked parent | The attempt: state if open (owner), summary if open (others), Result if submitted (review per section 4) |
| `PATCH /api/quizzes/attempts/<id>` | owner | Save `answers` (merged; empty or null letter clears one), `flagged` (replaces), `elapsed_seconds`. `400` on a bad payload, `409` if submitted or `expired: true` past the deadline. 240/min |
| `POST /api/quizzes/attempts/<id>/submit` | owner | Optional final progress in the body; grades and closes; returns the Result. `409` if already submitted. 30/min |
| `GET /api/quizzes/students/<student_id>/attempts` | admin, linked parent | Summaries of all attempts of a student, newest first |
| `GET /api/quizzes/admin` | admin | All tests with settings, `question_count`, `attempt_count`, `submitted_count`, `average_percent` |
| `PATCH /api/quizzes/admin/<slug>` | admin | Change `is_active`, `reveal_answers`, `allow_retakes`, `time_limit_minutes` |
| `GET /api/quizzes/admin/results` | admin | Attempt summaries; query `quiz` (slug), `status` (`submitted` or `in_progress`), `classroom_id`; 500 newest |
| `DELETE /api/quizzes/admin/attempts/<id>` | admin | Delete an attempt |

## 9. Seed data

Files: `backend/application/commands/quiz_data/*.json`, one test per file, loaded by `application/commands/quiz_seed.py`. `flask seed` runs it as the step "Seeding student tests" (on every deploy, see [infrastructure_and_devops.md](infrastructure_and_devops.md#8-database-migrations)) and prints `Student tests: quizzes +new/~updated, questions +new/~updated[/-deleted].`

```json
{
  "slug": "cs-olympiad-grades-3-5",
  "title": "Computer Science (Grades 3-5)",
  "description": "Hardware, apps, block coding, Python.",
  "sort_order": 1,
  "source_url": "https://codingolympiad.org/documents/CS_3-4-5.pdf",
  "questions": [
    {
      "number": 1,
      "domain": "Hardware & OS",
      "prompt": "What is typically considered to be the most important hardware component in the computer?",
      "options": { "A": "Central Processing Unit (CPU)", "B": "Monitor", "C": "Speaker", "D": "External Hard Drive" },
      "answer": "A",
      "explanation": "The Central Processing Unit (CPU) is the 'brain' of the computer.",
      "diagram_html": null
    }
  ]
}
```

- **Sync rules**: tests are matched by `slug`, questions by `number`.
    - Overwritten from the files: `title`, `description`, `source_url`, `sort_order` and every question field.
    - Never touched on an existing test: `is_active`, `reveal_answers`, `allow_retakes`, `time_limit_minutes`. A new test gets the model defaults (active, answers shown, retakes on, no limit).
    - A question whose number is gone from the file is deleted. Submitted attempts keep their graded snapshot (section 3).
    - Attempts are never touched. Answers are keyed by question number, so renumbering or re-keying a question changes what attempts still open are graded against.
    - Running it twice changes nothing.
- **Validation**: all files are checked before anything is written. A problem raises `QuizDataError` naming the file, nothing is loaded, and `flask seed` prints `Error seeding student tests: ...`. Rules:
    - `slug` and `title`: non-empty text; `description`, `source_url`: text or null; `sort_order`: whole number; slugs unique across files.
    - `questions`: non-empty list; `number` a whole number 1-10000, unique in the file; `domain`, `prompt` non-empty; `options` a non-empty object with one-character keys and non-empty text; `answer` one of the option keys; `explanation`, `diagram_html` text or null.

## 10. Diagrams

- `diagram_html` is an HTML/SVG fragment per question. It is sent with the question and rendered by `frontend/src/components/quiz/DiagramFrame.jsx` in an `<iframe sandbox="allow-same-origin" srcDoc=...>`. There is no `allow-scripts`, so no script or event handler runs; `allow-same-origin` is there only so the page can measure the content and size the frame (a `ResizeObserver` keeps it in step). The iframe document holds `quizDiagramStyles.js` plus a transparent, margin-free body, so diagram styles never reach the app and app styles never reach the diagram.
- Diagrams must not rely on scripts. Inline SVG, inline `style` attributes and Tailwind classes work.
- **Styles**: `frontend/src/components/quiz/quizDiagramStyles.js` is a Tailwind 3.4.17 build (preflight plus the utilities) over the class names in the JSON files, exported as one string. A class that is not in it has no effect, so regenerate after a diagram uses a new class. The app itself does not use Tailwind and has no build step for this; run the CLI by hand.

  Put these in a scratch folder (not in the repo):

  `in.css`
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

  `tailwind.config.cjs`
  ```js
  module.exports = {
    content: ['backend/application/commands/quiz_data/*.json'],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        },
      },
    },
  };
  ```

  From the repository root:

  ```bash
  npx tailwindcss@3.4.17 -c <scratch>/tailwind.config.cjs -i <scratch>/in.css --minify -o <scratch>/out.css
  node -e "const fs=require('fs');const f='frontend/src/components/quiz/quizDiagramStyles.js';const head=fs.readFileSync(f,'utf8').split('\n').filter(l=>l.startsWith('//')).join('\n');fs.writeFileSync(f,head+'\nexport default '+JSON.stringify(fs.readFileSync('<scratch>/out.css','utf8').trim())+';\n')"
  ```

  The content globs resolve from the working directory. The `fontFamily` lines match the font stacks already in the file. Because the JSON also holds prose, a few stray utilities for plain words (`block`, `contents`) can appear; they are harmless. Check the result with the diagram tests (`DiagramFrame.test.jsx`) and by opening a test with diagrams.

## 11. Adding a new test

1. Create `backend/application/commands/quiz_data/<slug>.json` in the format above. Set `sort_order` for its place in the list.
2. For a diagram, put the fragment in `diagram_html` (no scripts). If it uses Tailwind classes not yet in the build, regenerate `quizDiagramStyles.js` (section 10).
3. Run `flask seed` from `backend/`. It validates every file first, then adds the test; check the printed counts.
4. Open `/admin/tests` and set Active, Answers shown, Retakes and Time limit. A new test starts active, with answers shown, retakes on and no limit.
5. Update `test_the_shipped_files_are_three_tests_of_thirty_questions` in `backend/tests/app/test_quiz_seed.py`, which pins the shipped files.

To change an existing test, edit its file and run `flask seed`; deploys do this by themselves. No migration is needed for content.

## 12. Tests

| Layer | File | Covers |
|-|-|-|
| Backend | `backend/tests/app/routes/test_quiz_routes.py` | List, start/resume, deadline and time limit, save/submit, grading and snapshot, review visibility, duck reward, admin settings/results/delete, races, no leakage to profile or report data |
| Backend | `backend/tests/app/test_quiz_seed.py` | Shipped files, upsert, admin settings kept, deleted questions, validation, the `seed` command |
| Backend | `backend/tests/test_migration_student_tests.py` | Revision order, tables and keys, one open attempt, rerun, downgrade |
| Backend | `backend/tests/app/models/test_user_deletion.py` | Quiz rows are deleted with the user |
| Frontend | `frontend/src/pages/Tests/TestList.test.jsx`, `TakeTest.test.jsx`, `TestResult.test.jsx` | List, taking (autosave, clock, expiry, submit), result routes |
| Frontend | `frontend/src/components/quiz/QuizResultView.test.jsx`, `DiagramFrame.test.jsx` | Result view, sandboxed diagram |
| Frontend | `frontend/src/pages/Admin/AdminTests.test.jsx`, `AdminUserDashboard.test.jsx`, `frontend/src/pages/Parent/ParentReportCard.test.jsx` | Admin page, Tests sections |
| E2E | `frontend/tests-e2e/student_tests.spec.js` | Take, resume, submit, read result; no key while open; admin view and delete; no leak to profile or unlinked parent |

Commands:

```bash
# backend/
python -m pytest tests/app/routes/test_quiz_routes.py tests/app/test_quiz_seed.py tests/test_migration_student_tests.py -q

# frontend/
npx vitest run src/pages/Tests src/components/quiz src/pages/Admin/AdminTests.test.jsx

# frontend/ (backend on :8000; Playwright starts the Vite dev server)
npx playwright test tests-e2e/student_tests.spec.js
```

The e2e spec signs in through `/api/dev-login`, so it needs a development backend with the tests seeded (`flask seed`).
