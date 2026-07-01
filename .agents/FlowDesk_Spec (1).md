# Spec.md: FlowDesk Project \& AI Task Management System

## Context

* **Feature name:** FlowDesk – Intelligent Project Management with AI Transcript Processing.
* **Business goal:** Eliminate the cognitive friction, manual effort, and operational task drop-off that occurs when converting verbal, text-heavy meeting logs into organized, actionable tasks.
* **Target users:** Professionals operating in high-meeting environments (Managers, Consultants, Freelancers, and Learning \& Development Specialists) who require a unified, low-friction personal dashboard to track workflows.
* **Stack:**

  * Frontend: React + Vite, Tailwind CSS
  * Backend: Node.js + Express
  * Database: SQLite (via `node:sqlite` — Node.js built-in)
  * AI: OpenAI API — direct fetch calls, no SDK wrapper
* **Files/folders allowed to touch:**

  * `client/src/components/\\\*\\\*/\\\*` (UI components, Kanban board, upload zones)
  * `client/src/pages/\\\*\\\*/\\\*` (Page-level React components)
  * `client/src/hooks/\\\*\\\*/\\\*` (Custom React hooks)
  * `server/routes/\\\*\\\*/\\\*` (Express API routes)
  * `server/db/\\\*\\\*/\\\*` (SQLite schema, migrations, queries)
  * `server/lib/\\\*\\\*/\\\*` (AI prompt logic, file parsing utilities)
* **Files/folders NOT to touch:**

  * `vite.config.js`
  * `tailwind.config.js`
  * `postcss.config.js`
  * `.env` (Do not commit real keys; only update `.env.example`)

\---

## Requirements (EARS format)

### 1\. Project Hierarchy \& Database Management

* **WHEN** a user requests the creation of an Area, Project, or Sub-Project, **THE SYSTEM SHALL** write a new record to the corresponding SQLite table, enforcing a strict hierarchy of `Area → Project → Task`.
* **WHEN** a user inputs a name for an Area or Project that matches an existing record at the exact same hierarchical tier, **THE SYSTEM SHALL** block creation and display the inline validation error: `"שם זה כבר קיים ברמה זו. נא לבחור שם אחר."`
* **WHEN** a user requests the deletion of an Area or Project, **THE SYSTEM SHALL** show a confirmation modal dialog.
* **WHEN** the user confirms deletion, **THE SYSTEM SHALL** execute a cascading `DELETE` via SQLite foreign key constraints, permanently removing that entity and all child records within 400ms.

### 2\. File Upload \& Server-Side Document Parsing

* **WHEN** a user drops or selects a file in the Drop Zone, **THE SYSTEM SHALL** validate the extension against the whitelist: `.txt`, `.docx`, `.pdf`.
* **IF** the file extension is not supported, **THE SYSTEM SHALL** abort processing and display: `"פורמט הקובץ אינו נתמך, נא להעלות .txt, .docx או .pdf"`.
* **WHEN** a valid file is submitted, **THE SYSTEM SHALL** send it to the Express backend via HTTP POST multipart request.
* **WHILE** text extraction executes on the server, **THE SYSTEM SHALL** display a loading spinner with the text: `"מעבד את הקובץ... נא לא לסגור את העמוד"`.
* Text extraction is handled server-side using `pdf-parse` (for `.pdf`) and `mammoth` (for `.docx`). No external storage is used — files are processed in memory only.

### 3\. AI Processing \& Context Injection

* **WHEN** raw text extraction finishes, **THE SYSTEM SHALL** insert a row into the `transcripts` table with `status = 'processing'` and return a `202 Accepted` response with the transcript ID to the client within 500ms.
* **WHEN** the server initiates the AI processing job, **THE SYSTEM SHALL** query all existing Areas, Projects, and Sub-Projects for that user and inject them into the OpenAI API prompt as context.
* **THE SYSTEM SHALL** call the OpenAI API directly via fetch, instructing it to return a strict JSON object matching the task schema.
* **IF** the OpenAI API returns successfully, **THE SYSTEM SHALL** update the transcript record to `status = 'completed'` and store the structured response in a `structured\\\_analysis` TEXT field (JSON stringified).
* **IF** the OpenAI API fails or times out, **THE SYSTEM SHALL** update the transcript to `status = 'failed'` and display: `"עיבוד התמלול נכשל. נא לנסות שוב."`.
* **IF** the AI returns zero tasks, **THE SYSTEM SHALL** display: `"לא נמצאו משימות בתמלול"` with an `"הוסף משימה ידנית"` button.

### 4\. Transcript Review \& Confirmation

* **WHEN** a transcript transitions to `status = 'completed'`, **THE SYSTEM SHALL** populate the Approval Screen with editable task titles, priority dropdowns, and project assignment selectors.
* **IF** the AI cannot determine a matching project for a task, **THE SYSTEM SHALL** assign it to the default Area `"כללי"`.
* **WHEN** the user clicks `"אישור שמירה"`, **THE SYSTEM SHALL** write all confirmed tasks to the SQLite `tasks` table, link them to the transcript ID, and navigate to the Kanban screen within 300ms.

### 5\. Kanban Board

* **WHEN** rendering the Project view, **THE SYSTEM SHALL** display exactly three columns: `"טרם התחיל"`, `"בביצוע"`, `"הושלם"`.
* **WHEN** a user drags a task card to a new column, **THE SYSTEM SHALL** apply an optimistic UI update within 50ms, then send a PATCH request to the Express backend to persist the new status.
* **IF** the PATCH request fails, **THE SYSTEM SHALL** revert the card to its original column within 150ms and display: `"עדכון הסטטוס נכשל בשל בעיית רשת"`.
* **WHEN** a task's due date has passed and its status is not `"הושלם"`, **THE SYSTEM SHALL** visually flag the card with a red border and an overdue icon.

### 6\. Search \& Archive

* **WHEN** a user types in the Archive search bar, **THE SYSTEM SHALL** perform a full-text search across transcript titles, content, and associated task descriptions in SQLite.
* **IF** search returns no results, **THE SYSTEM SHALL** display: `"לא נמצאו תמלולים התואמים לחיפוש"`.
* **WHEN** a user clicks a task linked from an archive entry that no longer exists, **THE SYSTEM SHALL** display: `"המשימה אינה קיימת יותר"`.

### 7\. Dashboard

* **THE SYSTEM SHALL** display: total open tasks, high-priority tasks, and tasks due this week.
* **IF** there are no tasks, **THE SYSTEM SHALL** display: `"אין משימות כרגע"` with a prompt to create one.

\---

## Out of Scope

1. User authentication — no login, no registration, single-user local app.
2. Calendar synchronization.
3. Multi-user collaboration.
4. Live voice/audio transcription.
5. AI analytics or productivity insights.
6. Custom Kanban column names beyond the fixed three.

\---

## Database Schema (SQLite)

```sql
CREATE TABLE areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  area\\\_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE
);

CREATE TABLE sub\\\_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  project\\\_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK(priority IN ('גבוהה', 'בינונית', 'נמוכה')) DEFAULT 'בינונית',
  status TEXT CHECK(status IN ('טרם התחיל', 'בביצוע', 'הושלם')) DEFAULT 'טרם התחיל',
  due\\\_date TEXT,
  project\\\_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  transcript\\\_id INTEGER REFERENCES transcripts(id)
);

CREATE TABLE transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  raw\\\_text TEXT NOT NULL,
  structured\\\_analysis TEXT,
  status TEXT CHECK(status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  created\\\_at TEXT DEFAULT (datetime('now'))
);
```

\---

## Technical Decisions

|Decision|Chosen|Rejected|Reason|
|-|-|-|-|
|App Architecture|React + Vite (client) + Express (server)|Next.js fullstack|Simpler for course scope, clear separation between client and server|
|Database|SQLite via `node:sqlite`|PostgreSQL / Supabase|No server setup required, file-based, ideal for single-user local app|
|AI Integration|OpenAI API via direct fetch|Vercel AI SDK|No SDK overhead, full control over prompt and response parsing|
|Auth|None (single-user)|Supabase Auth|Out of scope for this project|
|Deletion|Hard DELETE with CASCADE|Soft delete|Keeps DB simple and matches PRD requirements|

\---

## Performance

* UI interactions (drag, click, navigation): under 100ms
* DB write operations: under 200ms
* File parsing (excluding AI): under 2000ms

\---

## Security

* OpenAI API key lives only in `.env` on the server — never sent to the client.
* All AI calls are made server-side via Express routes.

