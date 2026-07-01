CREATE TABLE IF NOT EXISTS areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  raw_text TEXT NOT NULL,
  structured_analysis TEXT,
  status TEXT CHECK(status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK(priority IN ('גבוהה', 'בינונית', 'נמוכה')) DEFAULT 'בינונית',
  status TEXT CHECK(status IN ('טרם התחיל', 'בביצוע', 'הושלם')) DEFAULT 'טרם התחיל',
  due_date TEXT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  transcript_id INTEGER REFERENCES transcripts(id)
);
