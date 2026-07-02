const express = require('express');
const router = express.Router();
const db = require('../db/index');

// GET /api/tasks - Fetches all tasks (with optional project_id filtering)
router.get('/', (req, res) => {
  const { project_id } = req.query;
  try {
    let tasks;
    if (project_id) {
      tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(project_id);
    } else {
      tasks = db.prepare('SELECT * FROM tasks').all();
    }

    // Convert numerical IDs properly in return objects
    const formattedTasks = tasks.map(t => ({
      ...t,
      id: Number(t.id),
      project_id: t.project_id ? Number(t.project_id) : null,
      transcript_id: t.transcript_id ? Number(t.transcript_id) : null
    }));

    res.status(200).json(formattedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/tasks/:id - Fetches a single task by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ error: 'המשימה המבוקשת אינה קיימת' });
    }

    res.status(200).json({
      ...task,
      id: Number(task.id),
      project_id: task.project_id ? Number(task.project_id) : null,
      transcript_id: task.transcript_id ? Number(task.transcript_id) : null
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/tasks - Creates a new task
router.post('/', (req, res) => {
  const { title, description, priority, status, due_date, project_id, transcript_id } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'כותרת המשימה היא שדה חובה' });
  }
  if (!description || description.trim() === '') {
    return res.status(400).json({ error: 'תיאור המשימה הוא שדה חובה' });
  }
  if (!project_id) {
    return res.status(400).json({ error: 'פרויקט משויך הוא שדה חובה' });
  }

  const finalPriority = priority || 'בינונית';
  const finalStatus = status || 'טרם התחיל';

  // Validations
  if (!['גבוהה', 'בינונית', 'נמוכה'].includes(finalPriority)) {
    return res.status(400).json({ error: 'ערך העדיפות אינו תקין' });
  }
  if (!['טרם התחיל', 'בביצוע', 'הושלם'].includes(finalStatus)) {
    return res.status(400).json({ error: 'ערך הסטטוס אינו תקין' });
  }

  try {
    // Verify project exists (since project_id is mandatory now)
    const project = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(project_id);
    if (!project) {
      return res.status(404).json({ error: 'הפרויקט המבוקש אינו קיים' });
    }

    const stmt = db.prepare(`
      INSERT INTO tasks (title, description, priority, status, due_date, project_id, transcript_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      title.trim(),
      description || null,
      finalPriority,
      finalStatus,
      due_date || null,
      project_id || null,
      transcript_id || null
    );

    res.status(201).json({
      id: Number(result.lastInsertRowid),
      title: title.trim(),
      description: description || null,
      priority: finalPriority,
      status: finalStatus,
      due_date: due_date || null,
      project_id: project_id ? Number(project_id) : null,
      transcript_id: transcript_id ? Number(transcript_id) : null
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/tasks/:id - Updates task details (highly crucial for Kanban drag-and-drop)
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, priority, status, due_date, project_id } = req.body;

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ error: 'המשימה המבוקשת אינה קיימת' });
    }

    const newTitle = title !== undefined ? title : task.title;
    const newDesc = description !== undefined ? description : task.description;
    const newPriority = priority !== undefined ? priority : task.priority;
    const newStatus = status !== undefined ? status : task.status;
    const newDueDate = due_date !== undefined ? due_date : task.due_date;
    const newProjectId = project_id !== undefined ? project_id : task.project_id;

    // Validations
    if (newTitle !== undefined && (!newTitle || newTitle.trim() === '')) {
      return res.status(400).json({ error: 'כותרת המשימה היא שדה חובה' });
    }
    if (newDesc !== undefined && (!newDesc || newDesc.trim() === '')) {
      return res.status(400).json({ error: 'תיאור המשימה הוא שדה חובה' });
    }
    if (newProjectId !== undefined && !newProjectId) {
      return res.status(400).json({ error: 'פרויקט משויך הוא שדה חובה' });
    }
    if (newPriority && !['גבוהה', 'בינונית', 'נמוכה'].includes(newPriority)) {
      return res.status(400).json({ error: 'ערך העדיפות אינו תקין' });
    }
    if (newStatus && !['טרם התחיל', 'בביצוע', 'הושלם'].includes(newStatus)) {
      return res.status(400).json({ error: 'ערך הסטטוס אינו תקין' });
    }

    if (newProjectId) {
      const project = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(newProjectId);
      if (!project) {
        return res.status(404).json({ error: 'הפרויקט המבוקש אינו קיים' });
      }
    }

    const stmt = db.prepare(`
      UPDATE tasks 
      SET title = ?, description = ?, priority = ?, status = ?, due_date = ?, project_id = ?
      WHERE id = ?
    `);
    stmt.run(
      typeof newTitle === 'string' ? newTitle.trim() : newTitle,
      newDesc,
      newPriority,
      newStatus,
      newDueDate,
      newProjectId,
      id
    );

    res.status(200).json({
      id: Number(id),
      title: typeof newTitle === 'string' ? newTitle.trim() : newTitle,
      description: newDesc,
      priority: newPriority,
      status: newStatus,
      due_date: newDueDate,
      project_id: newProjectId ? Number(newProjectId) : null,
      transcript_id: task.transcript_id ? Number(task.transcript_id) : null
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/tasks/:id - Deletes a task
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'המשימה המבוקשת אינה קיימת' });
    }
    res.status(200).json({ message: 'המשימה נמחקה בהצלחה' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/tasks/batch - Creates multiple tasks in a single SQLite transaction
router.post('/batch', (req, res) => {
  const { tasks } = req.body;

  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'רשימת המשימות צריכה להיות מערך' });
  }

  // Validate all tasks before inserting to prevent partial failures
  for (const task of tasks) {
    if (!task.title || task.title.trim() === '') {
      return res.status(400).json({ error: 'כותרת המשימה היא שדה חובה לכל המשימות' });
    }
    if (!task.description || task.description.trim() === '') {
      return res.status(400).json({ error: 'תיאור המשימה הוא שדה חובה לכל המשימות' });
    }
    if (!task.project_id) {
      return res.status(400).json({ error: 'פרויקט משויך הוא שדה חובה לכל המשימות' });
    }
    const priority = task.priority || 'בינונית';
    const status = task.status || 'טרם התחיל';

    const project = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(task.project_id);
    if (!project) {
      return res.status(404).json({ error: `יש להוסיף שיוך לפרויקט` });
    }
  }

  try {
    db.exec('BEGIN');

    const insertStmt = db.prepare(`
      INSERT INTO tasks (title, description, priority, status, due_date, project_id, transcript_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const createdTasks = [];

    for (const t of tasks) {
      const title = t.title.trim();
      const description = t.description || null;
      const priority = t.priority || 'בינונית';
      const status = t.status || 'טרם התחיל';
      const due_date = t.due_date || null;
      const project_id = t.project_id || null;
      const transcript_id = t.transcript_id || null;

      const result = insertStmt.run(
        title,
        description,
        priority,
        status,
        due_date,
        project_id,
        transcript_id
      );

      createdTasks.push({
        id: Number(result.lastInsertRowid),
        title,
        description,
        priority,
        status,
        due_date,
        project_id: project_id ? Number(project_id) : null,
        transcript_id: transcript_id ? Number(transcript_id) : null
      });
    }

    db.exec('COMMIT');
    res.status(201).json(createdTasks);
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Failed to rollback transaction:', rollbackErr);
    }
    console.error('Error in batch task creation:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
