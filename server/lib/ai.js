const fetch = globalThis.fetch; // Node.js v18+ native fetch

/**
 * Builds the prompt for the Claude API, injecting the current project hierarchy as context.
 * @param {string} rawText - Raw text extracted from the transcript
 * @param {Array} hierarchy - Existing Areas/Projects/Sub-Projects hierarchy
 * @returns {string} The complete prompt
 */
function buildClaudePrompt(rawText, hierarchy) {
  const projectsList = [];
  hierarchy.forEach(area => {
    if (area.projects && Array.isArray(area.projects)) {
      area.projects.forEach(proj => {
        projectsList.push({
          id: proj.id,
          name: proj.name,
          area_name: area.name
        });
      });
    }
  });

  const formattedProjects = projectsList.map(p =>
    `- מזהה פרויקט: ${p.id}, שם הפרויקט: "${p.name}", קטגוריה: "${p.area_name}"`
  ).join('\n');

  return `אתה עוזר AI חכם המנתח תמלילי פגישות ומחלץ מהם סיכום ומשימות אופרטיביות.
משימתך היא לנתח את הטקסט של תמליל הפגישה הבא, ולחלץ ממנו סיכום קצר של הפגישה וכן רשימת משימות ברורות לביצוע.

הנה רשימת הפרויקטים הקיימים במערכת:
${formattedProjects || 'אין פרויקטים קיימים במערכת.'}

הנחיות לשיוך פרויקטים:
1. עבור כל משימה שאתה מחלץ, עליך לשייך אותה לאחד מהפרויקטים ברשימה על בסיס שם הפרויקט המוזכר בהקשר של המשימה.
2. עליך להחזיר את מזהה הפרויקט (project_id) המספרי המתאים בשדה "project_id". חובה לשייך משימה לפרויקט כלשהו (אל תחזיר null בשדה זה).

הנחיות לפורמט הפלט:
עליך להחזיר פלט בפורמט JSON בלבד, ללא שום טקסט נוסף לפניו או אחריו.
מבנה ה-JSON חייב להיות בדיוק כך:
{
  "summary": "סיכום קצר וממצה של הפגישה בעברית (עד 3-4 משפטים)",
  "tasks": [
    {
      "title": "כותרת המשימה בעברית (ברורה, קצרה ואופרטיבית)",
      "description": "תיאור מפורט של המשימה או הערות רלוונטיות בעברית (או null אם אין)",
      "priority": "עדיפות המשימה: 'גבוהה', 'בינונית' או 'נמוכה' בלבד",
      "due_date": "תאריך יעד בפורמט YYYY-MM-DD אם הוזכר בפגישה, אחרת null",
      "project_id": מזהה הפרויקט המספרי המתאים מרשימת הפרויקטים לעיל
    }
  ]
}

טקסט התמליל לניתוח:
"""
${rawText}
"""`;
}

/**
 * Generates local mock analysis when no API key is provided or dummy key is active.
 * @param {string} rawText 
 * @param {Array} hierarchy 
 * @returns {Object} Structured analysis
 */
function generateMockAnalysis(rawText, hierarchy) {
  // Find project IDs by keyword in names
  const findProjectId = (keywords) => {
    for (const area of hierarchy) {
      if (area.projects && Array.isArray(area.projects)) {
        for (const proj of area.projects) {
          const matchProj = keywords.some(kw => proj.name.toLowerCase().includes(kw.toLowerCase()));
          if (matchProj) {
            return proj.id;
          }
        }
      }
    }
    return null;
  };

  const hasKeywords = (text, keywords) => {
    return keywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
  };

  const tasks = [];

  if (hasKeywords(rawText, ['אתר', 'backend', 'עיצוב', 'ממשק'])) {
    const projId = findProjectId(['אתר', 'בית']) || 1;
    tasks.push({
      title: 'הגדרת ארכיטקטורת Backend לאתר הבית',
      description: 'הקמת תשתית הפרויקט, חיבור בסיס הנתונים SQLite וכתיבת נתיבי ה-API הראשוניים.',
      priority: 'גבוהה',
      due_date: '2026-06-25',
      project_id: projId
    });
    tasks.push({
      title: 'עיצוב ממשק משתמש (UI) ל-Dashboard',
      description: 'עיצוב מודרני מבוסס ערכת נושא כהה Sleek בלקוח React.',
      priority: 'בינונית',
      due_date: '2026-06-28',
      project_id: projId
    });
  }

  if (hasKeywords(rawText, ['אפליקציה', 'מובייל', 'QA', 'בדיקות'])) {
    const projId = findProjectId(['אפליקציה', 'מובייל']) || 2;
    tasks.push({
      title: 'בדיקות QA מקיפות לאפליקציית המובייל',
      description: 'הרצת בדיקות פונקציונליות על גרסת הבטא של האפליקציה.',
      priority: 'גבוהה',
      due_date: '2026-07-02',
      project_id: projId
    });
  }

  if (hasKeywords(rawText, ['קמפיין', 'שיווק', 'פייסבוק'])) {
    const projId = findProjectId(['קמפיין', 'דיגיטלי']) || 3;
    tasks.push({
      title: 'הכנת באנרים לקמפיין פייסבוק',
      description: 'עיצוב שלושה באנרים שונים בגדלים המתאימים לקידום הקמפיין.',
      priority: 'נמוכה',
      due_date: null,
      project_id: projId
    });
  }

  // If no specific keywords matched, add a generic task
  if (tasks.length === 0) {
    let fallbackProjId = 1;
    for (const area of hierarchy) {
      if (area.projects && area.projects.length > 0) {
        fallbackProjId = area.projects[0].id;
        break;
      }
    }
    tasks.push({
      title: 'ניתוח ראשוני והערכת משימות מהפגישה',
      description: 'מעבר על תמלול הפגישה והגדרת משימות מפורטות לצוות.',
      priority: 'בינונית',
      due_date: null,
      project_id: fallbackProjId
    });
  }

  return {
    summary: `סיכום פגישה מקומי (מצב מוק): פגישת עבודה שדנה בקידום משימות שוטפות. במהלך הפגישה הועלו נקודות מרכזיות לביצוע וחילקנו משימות בהתאם לתחומי האחריות.`,
    tasks: tasks
  };
}

/**
 * Sends a transcript to OpenAI API for task extraction and summary.
 * @param {string} rawText - Extracted transcript text
 * @param {Array} hierarchy - Current projects hierarchy context
 * @returns {Promise<Object>} The structured JSON analysis
 */
async function generateTranscriptAnalysis(rawText, hierarchy) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'dummy_key_for_local_dev_and_testing' || apiKey.trim() === '') {
    console.log('[AI] Using local mock analysis (dummy or missing API key)');
    // Simulate slight network delay (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));
    return generateMockAnalysis(rawText, hierarchy);
  }

  const prompt = buildClaudePrompt(rawText, hierarchy);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const assistantContent = data.choices?.[0]?.message?.content;

    if (!assistantContent) {
      throw new Error('OpenAI API returned an empty or invalid content block');
    }

    // Extract JSON block from output
    const jsonStart = assistantContent.indexOf('{');
    const jsonEnd = assistantContent.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON block found in OpenAI response');
    }
    const jsonStr = assistantContent.substring(jsonStart, jsonEnd + 1);
    const parsedJson = JSON.parse(jsonStr);

    return parsedJson;
  } catch (error) {
    console.error('[AI] Error querying OpenAI API:', error);
    throw error;
  }
}

module.exports = {
  buildClaudePrompt,
  generateTranscriptAnalysis
};
