const express = require('express');
const router = express.Router();
const db = require('../db/index');

// GET /api/hierarchy - Returns complete hierarchy tree
router.get('/', (req, res) => {
  try {
    const areas = db.prepare('SELECT * FROM areas').all();
    const projects = db.prepare('SELECT * FROM projects').all();

    // Map projects by area ID
    const projectsMap = {};
    projects.forEach(proj => {
      if (!projectsMap[proj.area_id]) {
        projectsMap[proj.area_id] = [];
      }
      projectsMap[proj.area_id].push({
        id: proj.id,
        name: proj.name
      });
    });

    // Stitch complete tree
    const hierarchy = areas.map(area => ({
      id: area.id,
      name: area.name,
      projects: projectsMap[area.id] || []
    }));

    res.status(200).json(hierarchy);
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/hierarchy/areas - Creates a new Area
router.post('/areas', (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'שם הקטגוריה אינו יכול להיות ריק' });
  }

  try {
    // Check if Area name already exists (case-insensitive)
    const existing = db.prepare('SELECT 1 FROM areas WHERE LOWER(name) = LOWER(?)').get(name.trim());
    if (existing) {
      return res.status(400).json({ error: 'שם זה כבר קיים ברמה זו. נא לבחור שם אחר.' });
    }

    const stmt = db.prepare('INSERT INTO areas (name) VALUES (?)');
    const result = stmt.run(name.trim());

    res.status(201).json({ id: Number(result.lastInsertRowid), name: name.trim() });
  } catch (error) {
    console.error('Error creating area:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/hierarchy/projects - Creates a new Project under an Area
router.post('/projects', (req, res) => {
  const { name, area_id } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'שם הפרויקט אינו יכול להיות ריק' });
  }
  if (!area_id) {
    return res.status(400).json({ error: 'מזהה קטגוריה (area_id) הוא שדה חובה' });
  }

  try {
    // Check if Area exists
    const area = db.prepare('SELECT 1 FROM areas WHERE id = ?').get(area_id);
    if (!area) {
      return res.status(404).json({ error: 'הקטגוריה המבוקשת אינה קיימת' });
    }

    // Check if Project name already exists under the same Area
    const existing = db.prepare('SELECT 1 FROM projects WHERE LOWER(name) = LOWER(?) AND area_id = ?').get(name.trim(), area_id);
    if (existing) {
      return res.status(400).json({ error: 'שם זה כבר קיים ברמה זו. נא לבחור שם אחר.' });
    }

    const stmt = db.prepare('INSERT INTO projects (name, area_id) VALUES (?, ?)');
    const result = stmt.run(name.trim(), area_id);

    res.status(201).json({ id: Number(result.lastInsertRowid), name: name.trim(), area_id });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'שגיאה ביצירת פרויקט' });
  }
});



// DELETE /api/hierarchy/areas/:id - Deletes an Area (Cascades automatically)
router.delete('/areas/:id', (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare('DELETE FROM areas WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'הקטגוריה המבוקשת אינה קיימת' });
    }
    res.status(200).json({ message: 'הקטגוריה וכל הפרויקטים והמשימות המשויכים אליה נמחקו בהצלחה' });
  } catch (error) {
    console.error('Error deleting area:', error);
    res.status(500).json({ error: 'שגיאה במחיקת קטגוריה' });
  }
});

// DELETE /api/hierarchy/projects/:id - Deletes a Project (Cascades automatically)
router.delete('/projects/:id', (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'הפרויקט המבוקש אינו קיים' });
    }
    res.status(200).json({ message: 'הפרויקט וכל משימותיו נמחקו בהצלחה' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'שגיאה במחיקת פרויקט' });
  }
});
// PUT /api/hierarchy/areas/:id - Updates an Area name
router.put('/areas/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'שם הקטגוריה אינו יכול להיות ריק' });
  }

  try {
    // Check if Area exists
    const area = db.prepare('SELECT * FROM areas WHERE id = ?').get(id);
    if (!area) {
      return res.status(404).json({ error: 'הקטגוריה המבוקשת אינה קיימת' });
    }

    if (area.name === 'כללי') {
      return res.status(400).json({ error: 'לא ניתן לערוך את קטגוריית כללי' });
    }

    // Check if another Area name already exists (case-insensitive)
    const existing = db.prepare('SELECT 1 FROM areas WHERE LOWER(name) = LOWER(?) AND id != ?').get(name.trim(), id);
    if (existing) {
      return res.status(400).json({ error: 'שם זה כבר קיים ברמה זו. נא לבחור שם אחר.' });
    }

    const stmt = db.prepare('UPDATE areas SET name = ? WHERE id = ?');
    stmt.run(name.trim(), id);

    res.status(200).json({ id: Number(id), name: name.trim() });
  } catch (error) {
    console.error('Error updating area:', error);
    res.status(500).json({ error: 'שגיאה בעדכון קטגוריה' });
  }
});

// PUT /api/hierarchy/projects/:id - Updates a Project name
router.put('/projects/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'שם הפרויקט אינו יכול להיות ריק' });
  }

  try {
    // Check if Project exists
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({ error: 'הפרויקט המבוקש אינו קיים' });
    }

    // Check if Project name already exists under the same Area (excluding the current project)
    const existing = db.prepare('SELECT 1 FROM projects WHERE LOWER(name) = LOWER(?) AND area_id = ? AND id != ?').get(name.trim(), project.area_id, id);
    if (existing) {
      return res.status(400).json({ error: 'שם זה כבר קיים ברמה זו. נא לבחור שם אחר.' });
    }

    const stmt = db.prepare('UPDATE projects SET name = ? WHERE id = ?');
    stmt.run(name.trim(), id);

    res.status(200).json({ id: Number(id), name: name.trim(), area_id: project.area_id });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'שגיאה בעדכון פרויקט' });
  }
});

module.exports = router;

