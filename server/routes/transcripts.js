const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db/index');
const { extractTextFromBuffer } = require('../lib/parser');
const { generateTranscriptAnalysis } = require('../lib/ai');

// Configure multer with memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST /api/transcripts - Endpoint to upload, validate, parse text, and trigger AI processing
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'לא הועלה קובץ' });
    }

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const allowedExtensions = ['.txt', '.docx', '.pdf'];

    if (!allowedExtensions.includes(fileExt)) {
      return res.status(400).json({ 
        error: 'פורמט הקובץ אינו נתמך, נא להעלות .txt, .docx או .pdf' 
      });
    }

    // 1. Extract text in-memory
    let rawText;
    try {
      rawText = await extractTextFromBuffer(req.file.buffer, fileExt);
    } catch (parseError) {
      console.error('[Transcripts] Parser error:', parseError);
      return res.status(500).json({ error: 'שגיאה בחילוץ הטקסט מהקובץ' });
    }

    if (!rawText || rawText.trim() === '') {
      return res.status(400).json({ error: 'לא נמצא טקסט במסמך שהועלה' });
    }

    // 2. Insert initial transcript record into DB with 'processing' status
    const decodedTitle = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const stmt = db.prepare(`
      INSERT INTO transcripts (title, raw_text, status, structured_analysis)
      VALUES (?, ?, 'processing', NULL)
    `);
    const result = stmt.run(decodedTitle, rawText);
    const transcriptId = Number(result.lastInsertRowid);

    // 3. Respond immediately with 202 Accepted
    res.status(202).json({
      id: transcriptId,
      status: 'processing',
      message: 'הקובץ הועלה ומתחיל תהליך עיבוד ב-AI'
    });

    // 4. Run AI analysis in the background
    (async () => {
      try {
        console.log(`[AI Background] Starting analysis for transcript ID ${transcriptId}...`);
        
        // Fetch current hierarchy to inject as context
        const areas = db.prepare('SELECT * FROM areas').all();
        const projects = db.prepare('SELECT * FROM projects').all();

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

        const hierarchy = areas.map(area => ({
          id: area.id,
          name: area.name,
          projects: projectsMap[area.id] || []
        }));

        // Query AI
        const analysisResult = await generateTranscriptAnalysis(rawText, hierarchy);

        // Save result and complete status
        const updateStmt = db.prepare(`
          UPDATE transcripts 
          SET status = 'completed', structured_analysis = ?
          WHERE id = ?
        `);
        updateStmt.run(JSON.stringify(analysisResult), transcriptId);
        console.log(`[AI Background] Transcript ID ${transcriptId} completed successfully.`);
      } catch (aiError) {
        console.error(`[AI Background] Failed for transcript ID ${transcriptId}:`, aiError);
        
        // Update status to failed
        const failStmt = db.prepare(`
          UPDATE transcripts 
          SET status = 'failed'
          WHERE id = ?
        `);
        failStmt.run(transcriptId);
      }
    })();

  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/transcripts - List all transcripts or filter by search query 'q'
router.get('/', (req, res) => {
  const { q } = req.query;
  try {
    let transcripts;
    if (q && q.trim() !== '') {
      const searchPattern = `%${q.trim()}%`;
      transcripts = db.prepare(`
        SELECT id, title, raw_text, structured_analysis, status, created_at
        FROM transcripts
        WHERE title LIKE ? 
           OR json_extract(structured_analysis, '$.summary') LIKE ?
        ORDER BY created_at DESC
      `).all(searchPattern, searchPattern);
    } else {
      transcripts = db.prepare('SELECT * FROM transcripts ORDER BY created_at DESC').all();
    }

    const formatted = transcripts.map(t => ({
      id: Number(t.id),
      title: t.title,
      raw_text: t.raw_text,
      structured_analysis: t.structured_analysis ? JSON.parse(t.structured_analysis) : null,
      status: t.status,
      created_at: t.created_at
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/transcripts/:id - Polling/detail endpoint (includes associated tasks)
router.get('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const transcript = db.prepare('SELECT * FROM transcripts WHERE id = ?').get(id);
    
    if (!transcript) {
      return res.status(404).json({ error: 'התמלול המבוקש אינו קיים' });
    }

    // Fetch actual tasks linked to this transcript in the DB
    const tasks = db.prepare('SELECT * FROM tasks WHERE transcript_id = ?').all(id);
    const formattedTasks = tasks.map(t => ({
      ...t,
      id: Number(t.id),
      project_id: t.project_id ? Number(t.project_id) : null,
      transcript_id: t.transcript_id ? Number(t.transcript_id) : null
    }));

    res.status(200).json({
      id: Number(transcript.id),
      title: transcript.title,
      raw_text: transcript.raw_text,
      structured_analysis: transcript.structured_analysis ? JSON.parse(transcript.structured_analysis) : null,
      status: transcript.status,
      created_at: transcript.created_at,
      tasks: formattedTasks
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/transcripts/:id - Delete a transcript (unlink associated tasks without deleting them)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const transcript = db.prepare('SELECT 1 FROM transcripts WHERE id = ?').get(id);
    if (!transcript) {
      return res.status(404).json({ error: 'התמלול המבוקש אינו קיים' });
    }

    db.exec('BEGIN');
    // Set transcript_id to NULL on referencing tasks so tasks are preserved
    db.prepare('UPDATE tasks SET transcript_id = NULL WHERE transcript_id = ?').run(id);
    // Delete the transcript
    db.prepare('DELETE FROM transcripts WHERE id = ?').run(id);
    db.exec('COMMIT');

    res.status(200).json({ success: true, message: 'התמלול נמחק בהצלחה (המשימות נשמרו)' });
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Error deleting transcript:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
