const db = require('./index');

try {
  console.log('[FlowDesk Seed] Seeding database with mock data...');

  // 1. Clear existing data to ensure idempotency
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM transcripts');
  db.exec('DELETE FROM projects');
  db.exec('DELETE FROM areas');

  // Reset sqlite_sequence to clear auto-increment indexes
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('areas', 'projects', 'tasks', 'transcripts')");

  // 2. Insert Areas
  const insertArea = db.prepare('INSERT INTO areas (name) VALUES (?)');
  insertArea.run('כללי');         // ID 1
  insertArea.run('פיתוח תוכנה');   // ID 2
  insertArea.run('שיווק ומכירות'); // ID 3

  console.log('✓ Areas seeded.');

  // 3. Insert Projects
  const insertProject = db.prepare('INSERT INTO projects (name, area_id) VALUES (?, ?)');
  insertProject.run('אתר בית', 2);          // ID 1, under פיתוח תוכנה
  insertProject.run('אפליקציית מובייל', 2);  // ID 2, under פיתוח תוכנה
  insertProject.run('קמפיין דיגיטלי', 3);   // ID 3, under שיווק ומכירות

  console.log('✓ Projects seeded.');


  // 5. Insert Transcripts
  const insertTranscript = db.prepare('INSERT INTO transcripts (title, raw_text, structured_analysis, status) VALUES (?, ?, ?, ?)');
  insertTranscript.run(
    'פגישת התנעה אתר בית',
    'טקסט גולמי של פגישת ההתנעה המדבר על משימות ה-Backend והעיצוב...',
    JSON.stringify({
      summary: 'פגישת התנעה של פרויקט אתר הבית החדש.',
      tasks: [
        { title: 'אפיון ארכיטקטורה', priority: 'גבוהה', project: 'אתר בית' },
        { title: 'הגדרת סכמת ה-DB', priority: 'בינונית', project: 'אתר בית' }
      ]
    }),
    'completed'
  ); // ID 1

  console.log('✓ Transcripts seeded.');

  // 6. Insert Tasks
  const insertTask = db.prepare('INSERT INTO tasks (title, description, priority, status, due_date, project_id, transcript_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  
  // Tasks for "אתר בית" (project_id = 1)
  insertTask.run(
    'אפיון ארכיטקטורה',
    'הגדרת מבנה הפרויקט, השרתים והספריות שבהן נשתמש.',
    'גבוהה',
    'בביצוע',
    '2026-06-15',
    1,
    1
  );

  insertTask.run(
    'הגדרת סכמת ה-DB',
    'יצירת קבצי ה-SQL והפעלת ה-Migrations בשרת.',
    'בינונית',
    'טרם התחיל',
    '2026-06-20',
    1,
    1
  );

  // Overdue Task (due date passed, not completed) to test visual warnings
  insertTask.run(
    'כתיבת מסמך דרישות טכני',
    'משימה שפג תוקפה לצורך בדיקת חיווי גבול אדום בקנבן.',
    'גבוהה',
    'טרם התחיל',
    '2026-05-10', // Past date relative to May 27 2026
    1,
    null
  );

  // Completed Task (due date passed, but status is "הושלם" -> should NOT be flagged as overdue!)
  insertTask.run(
    'פגישת סיעור מוחות',
    'פגישה ראשונית שבוצעה והושלמה בהצלחה.',
    'נמוכה',
    'הושלם',
    '2026-05-01',
    1,
    null
  );

  // Task for "קמפיין דיגיטלי" (project_id = 3)
  insertTask.run(
    'עיצוב באנרים לפייסבוק',
    'יצירת 3 גרסאות שונות של באנרים שיווקיים.',
    'בינונית',
    'טרם התחיל',
    '2026-06-10',
    3,
    null
  );

  console.log('✓ Tasks seeded.');
  console.log('[FlowDesk Seed] Database seeded successfully.');
} catch (error) {
  console.error('[FlowDesk Seed] Seeding failed:', error);
  process.exit(1);
}
