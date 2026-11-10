# AI Study Planner

Студенттің оқу тапсырмаларын интеллектуалды жоспарлау жүйесі. A full-stack academic workspace built with Next.js App Router, React, TypeScript, Tailwind CSS, shadcn-style Radix components, Lucide, Framer Motion, Recharts, PostgreSQL, Prisma, Auth.js/NextAuth, Zod, React Hook Form and Sonner.

## What works

- Kazakh by default, Russian and English dictionaries with compile-time key parity; saved account language, timezone and theme.
- Landing page, email/password registration, login, remembered sessions, logout and protected workspace routes. bcrypt password hashing; password changes and resets invalidate previous sessions.
- Personal dashboard calculated from records: tasks, deadlines, completed work, recorded study time, subject progress and weekly activity. New accounts start empty.
- Subject CRUD with colors, icons, teacher and semester. Deleting a subject retains its tasks without a subject.
- Task CRUD with descriptions, notes, deadlines, priorities, difficulty, duration and completion/reopening. Search, filters, sorting, subject grouping, list/grid/kanban views; native drag-and-drop and an accessible status selector.
- Intelligent planner: timezone-aware available hours/days, daily caps, difficulty, urgency, importance, session splitting, breaks, existing commitments and workload balancing. Records unscheduled work explicitly; saved plans appear in the calendar. Repeated generation subtracts already scheduled and recorded work.
- Plan history and deletion; session editing/rescheduling/deletion/completion with server checks. Sessions cannot be moved into the past, beyond deadlines, outside availability or into overlapping commitments.
- Calendar month/week/day views, deadlines, planned sessions, exams and personal events; event CRUD; drag study sessions to another date. Session duration can be changed in its edit dialog. Calendar resizing by dragging is not implemented.
- Analytics for today, trailing 7/30 days or a custom period: daily time, completion, subject distribution and daily completion trend. Study streak counts consecutive local days with recorded completed work.
- Pomodoro focus timer with server-persisted start/pause/resume, reload recovery, task selection, short/long breaks, reset and skip. Only a fully elapsed focus session counts toward recorded time; abandoned sessions do not. Background browser time while running counts, paused time does not.
- AI assistant with stored chat, timestamps, clear history, authorized task context and a clear service-unavailable state.
- Profile editing, validated image uploads (PNG/JPEG/WebP up to 280 KB), academic information, settings, personal JSON export and password-confirmed account deletion.
- In-app reminders, read/unread/delete controls and database deduplication. A server worker/cron endpoint is included.
- Optional, isolated local seed account; no demo records are exposed to new users.

## Requirements

Node.js 22.16+ (22 LTS recommended), npm, and PostgreSQL 17+ or Docker. Use a current compatible Node LTS for production. Commit and use `package-lock.json` with `npm ci`.

## Local setup

```sh
npm ci
cp .env.example .env
docker compose up -d db
```

Windows PowerShell uses `Copy-Item .env.example .env`. Set `NEXTAUTH_SECRET` and `CRON_SECRET` to separate random values, for example generate one with:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then:

```sh
npm run db:generate
npm run db:migrate
npm run dev
```

Open **http://localhost:3000**, register and complete onboarding. `NEXTAUTH_URL` must match the browser origin, including port. The local Docker credentials in `.env.example` are development-only.

### Without Docker or an installed PostgreSQL

A development helper is provided:

```sh
npm run db:local
```

Keep it open. It starts a real PostgreSQL cluster on **127.0.0.1:54329** and creates `.env` with fresh random secrets if the file is absent. It never overwrites an existing `.env`; point an existing `DATABASE_URL` at that local cluster manually. The helper uses the development password `local-development-only`; do not expose it to a network or use it in production.

On Windows, the helper copies development PostgreSQL binaries and stores its cluster under `%TEMP%/ai-study-planner-local` to avoid PostgreSQL's Cyrillic path limitation. Keep this directory if you want to retain local data. On other platforms data is under `.local-data/postgres`. `LOCAL_DB_DIR` overrides the cluster path. A temporary directory can be cleaned by the operating system, so use a normal PostgreSQL service or an explicit ASCII data path for durable development records. Shut down the helper with Ctrl+C.

For the provided Windows workspace, a portable Node runtime was downloaded into the ignored `.tools/node-v22.16.0-win-x64` directory. To use it in the current PowerShell session:

```powershell
$env:PATH = "$PWD\.tools\node-v22.16.0-win-x64;$env:PATH"
npm.cmd run db:local
```

Use a second terminal for migrations and the application.

## Environment variables

| Variable                                   | Purpose                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | PostgreSQL URL including database/schema; use TLS for remote databases                                |
| `NEXTAUTH_URL`                             | Canonical application origin                                                                          |
| `NEXTAUTH_SECRET`                          | Random session signing/encryption secret, at least 32 bytes                                           |
| `OPENAI_API_KEY`                           | Optional server-only key; blank enables algorithm-only planning                                       |
| `OPENAI_MODEL`                             | Responses API model supporting text output; default `gpt-4.1-mini`; set one available to your account |
| `SMTP_HOST`, `SMTP_PORT`                   | SMTP password recovery provider; port 465 enables TLS from connection start, 587 uses STARTTLS        |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`  | SMTP authentication and verified sender                                                               |
| `CRON_SECRET`                              | Independent random bearer token for the reminder cron endpoint                                        |
| `SEED_DEMO`, `DEMO_EMAIL`, `DEMO_PASSWORD` | Explicit opt-in development seed settings                                                             |

Do not use `NEXT_PUBLIC_` prefixes for secrets. `.env` is ignored. No real service credentials are included.

## AI behavior and privacy

The scheduling engine is deterministic and always validates the schedule itself. If an API key is available, the server calls the OpenAI Responses API to explain the already valid plan. The UI identifies this as **Algorithm + OpenAI explanation** only after a successful request. It does not claim the model independently created or validated time slots. If that call fails, the saved schedule remains labeled **Intelligent algorithm**.

The assistant makes a real server-side Responses API request using only the signed-in student's relevant task, session and recent chat data. If the key is absent, invalid, rate-limited or the service fails, the stored response is explicitly a service-unavailable notice, translated at display time. No simulated AI answers are returned. Model output is rendered as plain text, and `store:false` is sent to the provider. Configure your deployment's disclosure and data policy before inviting users.

Reference: [OpenAI text generation](https://developers.openai.com/api/docs/guides/text).

## Scheduling details

`src/lib/scheduling.ts` scores urgency (inverse time until deadline), importance and difficulty; orders tasks; subtracts already recorded and reserved minutes; discovers gaps in preferred days/hours; splits work into bounded sessions; reserves recovery breaks; and chooses the least loaded eligible day. It never silently drops unallocated work. Planning periods are capped at 93 days. Break reservation is conservative: it also reserves the final recovery break, which can leave a small final gap unused.

Work is counted once through recorded completed focus sessions or explicitly completed scheduled sessions. Do not manually complete a planned session for time already recorded with the timer: these are independent records and are not automatically reconciled.

All stored instants are UTC; local dates and availability use an IANA timezone, default `Asia/Almaty`. Dates are converted on the server for planning and on forms before submission. Changes to study preferences do not retroactively move saved plans. Adjust or delete existing sessions before generating a replacement. Upcoming deadline recommendations on the overview are deterministic insights based on actual tasks, not AI chat responses.

## Background reminders

Production requires a scheduled server job; frontend polling is only for display refresh and opportunistic reconciliation. Configure a cron scheduler every 5 minutes to send:

```http
GET /api/cron/reminders
Authorization: Bearer <CRON_SECRET>
```

Alternatively run `npm run reminders` from a process with the environment loaded, e.g.:

```sh
node --env-file=.env --import tsx scripts/reminders.ts
```

The worker creates in-app notifications for configured deadline thresholds, overdue tasks and study sessions starting within an hour. Threshold keys include the task and deadline to avoid duplicates. Read and dismissed notices retain their deduplication keys, so the worker does not recreate them. This is in-app delivery; no push service or reminder emails are implemented. Browser timer notifications require permission and the browser to remain available. Configure the cron even if nobody has the app open.

## Database and migrations

```sh
npm run db:migrate                  # deploy checked-in migrations
npm run db:dev -- --name change     # create migration during development
npm run db:generate
```

The schema includes User, Account, Session, Subject, Task, StudyPlan, StudySession, CalendarEvent, FocusSession, Notification, UserSettings, AIChat, AIMessage, PasswordReset and RateLimit. NextAuth Credentials uses JWT sessions; Account/Session models are present for future provider support, while password authentication does not create database Session records. Server authorization checks session version and ownership on every private request. SQL constraints enforce valid durations/time ranges. Plan creation and manual calendar/session changes lock the owner's row to serialize scheduling writes.

To create development sample data:

```powershell
$env:SEED_DEMO = 'true'
$env:DEMO_PASSWORD = 'ChooseYourOwnStrong123!'
npm.cmd run db:seed
```

The seed refuses to run in production or overwrite an existing demo account. Its default email is `student@studyplanner.local`.

## Checks and tests

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

Database integration tests are opt-in and create/delete isolated test users in the configured database. Use a dedicated test database in CI:

```powershell
$env:RUN_DB_TESTS = 'true'
node --env-file=.env node_modules/vitest/vitest.mjs run
```

Unix: `RUN_DB_TESTS=true node --env-file=.env node_modules/vitest/vitest.mjs run`.

The unit suite covers urgency, scheduling invariants, deadline risk, timezone/DST boundaries, splitting, balancing, capacity, reserved work, forms and localization. Integration tests invoke the actual API handler against PostgreSQL, mock the session identity to exercise owner/foreign-user checks, and cover CRUD, planning, time conflicts, focus accounting and timestamps. Browser tests exercise real registration/login and the student flow.

Playwright:

```sh
npx playwright install chromium
npm run test:e2e
```

If Chrome is already installed, set `PLAYWRIGHT_CHANNEL=chrome` to use it. Set `E2E_BASE_URL` to test a running instance. The suite verifies the main flow and responsive widths 375, 768, 1024 and 1440. Browser tests create isolated accounts; use only a disposable test deployment.

## Production

1. Provision a PostgreSQL service, database credentials with least privilege, TLS and automated backups. Use a pooled URL appropriate for your host.
2. Set the environment variables in the hosting secret manager. Configure SMTP and the sender's SPF/DKIM before enabling password recovery. Without SMTP the UI reports configuration is required.
3. Run `npm ci`, `npm run db:migrate`, `npm run build`, then `npm start`. Deploy as a Node.js service (e.g. a container, managed Node host or Vercel with a reachable PostgreSQL service). This application is not a static export or Cloudflare Worker bundle.
4. Terminate HTTPS at a trusted reverse proxy, keep `NEXTAUTH_URL` canonical, restrict database ingress and set request size/time limits. Configure edge IP rate limiting for signup/login/reset plus the included shared PostgreSQL account-level limits. Do not trust arbitrary client-supplied forwarded IP headers.
5. Schedule the reminder endpoint, monitor errors and backups, review dependency updates, and test restore procedures. The included policy pages describe this project's behavior; the operator must provide deployment-specific legal/contact/retention details.

The application is implemented locally and has not been published to external hosting. OpenAI and SMTP require operator credentials. No external AI or mail delivery has been verified without those credentials.

## Practical limits

Calendar session drag resizing, automatic scheduled-session/focus-record reconciliation, automatic browser push delivery, subtasks and AI task breakdown are not implemented. The global workspace currently fetches all of a user's tasks/subjects/sessions and client-side lists reveal 30 tasks at a time; larger deployments should add server pagination and aggregate analytics queries. Plan history and visible chat/notifications are capped; the data export includes all records. This is a substantial functional foundation, not a claim of an audited commercial deployment.
