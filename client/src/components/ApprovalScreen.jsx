import React, { useState, useEffect } from 'react';
import {
  Check,
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
  FileText,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import TaskModal from './TaskModal';

export default function ApprovalScreen({ transcript, hierarchy, onSave, onCancel, isExitConfirmOpen }) {
  const [editedTasks, setEditedTasks] = useState(
    (transcript.structured_analysis?.tasks || []).map(t => ({
      title: t.title || '',
      description: t.description || '',
      priority: t.priority || 'בינונית',
      due_date: t.due_date || '',
      project_id: t.project_id ? Number(t.project_id) : null
    }))
  );
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToDeleteIndex, setTaskToDeleteIndex] = useState(null);
  const [taskDueDateInputs, setTaskDueDateInputs] = useState({});

  const formatDbDateToInput = (dbStr) => {
    if (!dbStr) return '';
    const parts = dbStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return '';
  };

  const parseInputDateToDb = (inputStr) => {
    if (!inputStr) return '';
    const cleaned = inputStr.replace(/[\.\-]/g, '/');
    const parts = cleaned.split('/');
    if (parts.length === 3) {
      const day = parts[0].trim();
      const month = parts[1].trim();
      const year = parts[2].trim();
      if (day.length <= 2 && month.length <= 2 && year.length === 4) {
        const d = parseInt(day, 10);
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
          return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }
    }
    return '';
  };

  const handleDateTextInputChange = (index, val) => {
    setTaskDueDateInputs(prev => ({ ...prev, [index]: val }));
    const dbFormat = parseInputDateToDb(val);
    if (dbFormat) {
      handleTaskChange(index, 'due_date', dbFormat);
    }
  };

  const handleDateTextInputBlur = (index) => {
    const val = taskDueDateInputs[index];
    if (val === undefined) return;
    if (!val) {
      handleTaskChange(index, 'due_date', '');
      return;
    }
    const dbFormat = parseInputDateToDb(val);
    if (dbFormat) {
      handleTaskChange(index, 'due_date', dbFormat);
      setTaskDueDateInputs(prev => ({ ...prev, [index]: formatDbDateToInput(dbFormat) }));
    } else {
      handleTaskChange(index, 'due_date', '');
    }
  };

  const handleDatePickerChange = (index, val) => {
    handleTaskChange(index, 'due_date', val);
    setTaskDueDateInputs(prev => ({ ...prev, [index]: formatDbDateToInput(val) }));
  };


  // ESC to cancel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isModalOpen && !isExitConfirmOpen && taskToDeleteIndex === null) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, isModalOpen, isExitConfirmOpen, taskToDeleteIndex]);

  // ESC to close task deletion confirmation modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && taskToDeleteIndex !== null) {
        setTaskToDeleteIndex(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [taskToDeleteIndex]);

  const totalErrors = Object.values(validationErrors).reduce(
    (acc, taskErrors) => acc + Object.keys(taskErrors).length,
    0
  );

  const projectOptions = [];
  hierarchy.forEach(area => {
    if (area.projects && Array.isArray(area.projects)) {
      area.projects.forEach(proj => {
        projectOptions.push({ id: proj.id, name: proj.name, areaName: area.name });
      });
    }
  });

  const handleTaskChange = (index, field, value) => {
    setEditedTasks(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
    setValidationErrors(prev => {
      if (!prev[index]) return prev;
      const copy = { ...prev };
      const taskErrors = { ...copy[index] };
      delete taskErrors[field];
      if (Object.keys(taskErrors).length === 0) {
        delete copy[index];
      } else {
        copy[index] = taskErrors;
      }
      return copy;
    });
  };

  const handleAddTaskSuccess = (createdTask) => {
    setEditedTasks(prev => [
      ...prev,
      {
        id: createdTask.id,
        title: createdTask.title || '',
        description: createdTask.description || '',
        priority: createdTask.priority || 'בינונית',
        due_date: createdTask.due_date || '',
        project_id: createdTask.project_id ? Number(createdTask.project_id) : null,
        isAlreadySaved: true
      }
    ]);
  };

  const handleRemoveTask = async (index) => {
    const taskToRemove = editedTasks[index];
    if (taskToRemove.id) {
      try {
        await fetch(`http://localhost:3001/api/tasks/${taskToRemove.id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete manually created task:', err);
      }
    }
    setEditedTasks(prev => prev.filter((_, i) => i !== index));
    setValidationErrors(prev => {
      const copy = {};
      Object.keys(prev).forEach(key => {
        const idx = Number(key);
        if (idx < index) copy[idx] = prev[idx];
        else if (idx > index) copy[idx - 1] = prev[idx];
      });
      return copy;
    });
  };

  const handleConfirmSave = async () => {
    if (editedTasks.length === 0) {
      setError('יש להגדיר לפחות משימה אחת לפני השמירה');
      return;
    }

    const errors = {};
    let hasErrors = false;

    for (let i = 0; i < editedTasks.length; i++) {
      const taskErrors = {};
      if (!editedTasks[i].title.trim()) { taskErrors.title = 'יש להזין שם משימה'; hasErrors = true; }
      if (!editedTasks[i].description || !editedTasks[i].description.trim()) { taskErrors.description = 'יש להזין תיאור משימה'; hasErrors = true; }
      if (!editedTasks[i].project_id) { taskErrors.project_id = 'יש לבחור פרויקט'; hasErrors = true; }
      if (Object.keys(taskErrors).length > 0) errors[i] = taskErrors;
    }

    if (hasErrors) {
      setValidationErrors(errors);
      setError(null);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);

      const firstErrorIndex = Object.keys(errors).map(Number).sort((a, b) => a - b)[0];
      if (firstErrorIndex !== undefined) {
        const taskErrors = errors[firstErrorIndex];
        let fieldToFocus = '';
        if (taskErrors.title) fieldToFocus = `task-title-${firstErrorIndex}`;
        else if (taskErrors.description) fieldToFocus = `task-desc-${firstErrorIndex}`;
        else if (taskErrors.project_id) fieldToFocus = `task-project-${firstErrorIndex}`;

        setTimeout(() => {
          const cardElement = document.getElementById(`task-card-${firstErrorIndex}`);
          if (cardElement) cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (fieldToFocus) {
            const inputElement = document.getElementById(fieldToFocus);
            if (inputElement) inputElement.focus();
          }
        }, 100);
      }
      return;
    }

    setError(null);
    setValidationErrors({});
    setIsSaving(true);

    const unsavedTasks = editedTasks.filter(t => !t.isAlreadySaved);
    const savedTasks = editedTasks.filter(t => t.isAlreadySaved);

    try {
      let savedResultData = [];

      if (unsavedTasks.length > 0) {
        const payload = {
          tasks: unsavedTasks.map(t => ({
            title: t.title.trim(),
            description: t.description ? t.description.trim() : null,
            priority: t.priority,
            status: 'טרם התחיל',
            due_date: t.due_date || null,
            project_id: t.project_id || null,
            transcript_id: transcript.id
          }))
        };

        const response = await fetch('http://localhost:3001/api/tasks/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'שגיאה בשמירת המשימות בבסיס הנתונים');
        savedResultData = data;
      }

      for (const t of savedTasks) {
        const response = await fetch(`http://localhost:3001/api/tasks/${t.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: t.title.trim(),
            description: t.description ? t.description.trim() : null,
            priority: t.priority,
            due_date: t.due_date || null,
            project_id: t.project_id || null
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'שגיאה בעדכון המשימות בבסיס הנתונים');
        }
      }

      if (onSave) onSave(savedResultData);
    } catch (err) {
      console.error('Save tasks failed:', err);
      setError(err.message || 'חיבור לשרת נכשל. אנא נסה שנית.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300" dir="rtl">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dark-600/50 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mt-1">סקירה ואישור משימות AI: {transcript.title}</h2>
          <p className="text-xs text-slate-400 mt-1">אנא עברו על סיכום הפגישה והמשימות שחולצו על מנת לאשר את הכנסתן ללוח העבודה.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onCancel}
            className="flex-1 md:flex-none px-5 py-2.5 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-all"
            disabled={isSaving}
          >
            ביטול
          </button>
          <button
            onClick={handleConfirmSave}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm border border-transparent ${isShaking ? 'animate-shake border-rose-500 ring-2 ring-rose-500/50' : ''}`}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
            <span>שמירת משימות</span>
            {totalErrors > 0 && (
              <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-md font-bold animate-pulse" aria-live="polite">
                {totalErrors} שגיאות
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-sm font-bold animate-in slide-in-from-top-4 duration-200" role="alert">
          <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Meeting Summary */}
      <div className="bg-dark-800/80 backdrop-blur-md border border-dark-600/50 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
            <FileText className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">סיכום המפגש מבוסס AI</h3>
            <p className="text-[11px] text-slate-500">תקציר הנקודות המרכזיות שעלו בשיחה</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed font-medium bg-dark-900/50 p-4 rounded-2xl border border-dark-600/30">
          {transcript.structured_analysis?.summary || 'לא נוצר סיכום עבור פגישה זו.'}
        </p>
      </div>

      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <div>
            <h3 className="text-lg font-bold text-white">המשימות שלך</h3>
            <p className="text-[11px] text-slate-500">תוכלו לערוך, להוסיף או להסיר משימות לפני השמירה הסופית</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-600 text-primary-400 hover:text-primary-300 rounded-xl text-xs font-bold transition-all shadow-sm"
            disabled={isSaving}
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>הוספת משימה</span>
          </button>
        </div>

        {editedTasks.length === 0 ? (
          <div className="bg-dark-800 border border-dark-600 border-dashed p-12 rounded-3xl text-center flex flex-col items-center justify-center py-16">
            <p className="text-slate-500 text-sm mb-4">לא חולצו משימות מהקובץ או שהסרתם את כולן.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              צור משימה ראשונה
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {editedTasks.map((task, index) => (
              <div
                key={index}
                id={`task-card-${index}`}
                className="bg-dark-800/40 hover:bg-dark-800/70 border border-dark-600/30 hover:border-dark-600/60 rounded-3xl p-6 shadow-md transition-all group relative border-r-4 border-r-primary-500/50"
              >
                {/* Badge */}
                <div className="absolute top-5 right-5 bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-bold px-2.5 py-1 rounded-xl select-none" aria-hidden="true">
                  #{index + 1}
                </div>

                {/* Delete */}
                <button
                  onClick={() => setTaskToDeleteIndex(index)}
                  className="absolute top-5 left-5 p-2 bg-dark-700/50 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                  aria-label={`הסר משימה ${index + 1}`}
                  disabled={isSaving}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>

                <div className="space-y-5 pt-8">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label htmlFor={`task-title-${index}`} className="text-xs font-semibold text-slate-400">שם המשימה <span className="text-rose-500 font-bold" aria-hidden="true">*</span></label>
                    <input
                      id={`task-title-${index}`}
                      type="text"
                      value={task.title}
                      onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                      placeholder="הזינו שם משימה..."
                      className={`w-full bg-dark-900 border rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors ${validationErrors[index]?.title ? 'border-rose-500' : 'border-dark-600'}`}
                      disabled={isSaving}
                      aria-required="true"
                      aria-invalid={!!validationErrors[index]?.title}
                    />
                    {validationErrors[index]?.title && (
                      <p className="text-rose-500 text-[11px] font-semibold mt-1" role="alert">{validationErrors[index].title}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label htmlFor={`task-desc-${index}`} className="text-xs font-semibold text-slate-400">תיאור <span className="text-rose-500 font-bold" aria-hidden="true">*</span></label>
                    <textarea
                      id={`task-desc-${index}`}
                      value={task.description || ''}
                      onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                      placeholder="תיאור מפורט של המשימה..."
                      rows={3}
                      className={`w-full bg-dark-900 border rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors resize-none ${validationErrors[index]?.description ? 'border-rose-500' : 'border-dark-600'}`}
                      disabled={isSaving}
                      aria-required="true"
                      aria-invalid={!!validationErrors[index]?.description}
                    />
                    {validationErrors[index]?.description && (
                      <p className="text-rose-500 text-[11px] font-semibold mt-1" role="alert">{validationErrors[index].description}</p>
                    )}
                  </div>

                  {/* Meta Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label htmlFor={`task-priority-${index}`} className="text-xs font-semibold text-slate-400">עדיפות</label>
                      <select
                        id={`task-priority-${index}`}
                        value={task.priority}
                        onChange={(e) => handleTaskChange(index, 'priority', e.target.value)}
                        className="w-full bg-dark-900 border border-dark-600 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
                        disabled={isSaving}
                      >
                        <option value="גבוהה">גבוהה</option>
                        <option value="בינונית">בינונית</option>
                        <option value="נמוכה">נמוכה</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor={`task-due-${index}`} className="text-xs font-semibold text-slate-400">תאריך יעד</label>
                      <div className="relative">
                        <input
                          id={`task-due-${index}`}
                          type="text"
                          placeholder="dd/mm/yyyy"
                          value={taskDueDateInputs[index] !== undefined ? taskDueDateInputs[index] : formatDbDateToInput(task.due_date)}
                          onChange={(e) => handleDateTextInputChange(index, e.target.value)}
                          onBlur={() => handleDateTextInputBlur(index)}
                          className="w-full bg-dark-900 border border-dark-600 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
                          disabled={isSaving}
                        />
                        
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center pointer-events-none">
                          <Calendar className="w-4 h-4 text-slate-400" aria-hidden="true" />
                        </div>

                        <input
                          type="date"
                          value={task.due_date || ''}
                          onChange={(e) => handleDatePickerChange(index, e.target.value)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 cursor-pointer"
                          disabled={isSaving}
                          title="בחר תאריך מלוח שנה"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor={`task-project-${index}`} className="text-xs font-semibold text-slate-400">שיוך לפרויקט <span className="text-rose-500 font-bold" aria-hidden="true">*</span></label>
                      <select
                        id={`task-project-${index}`}
                        value={task.project_id || ''}
                        onChange={(e) => handleTaskChange(index, 'project_id', e.target.value ? Number(e.target.value) : '')}
                        className={`w-full bg-dark-900 border rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-primary-500 transition-colors cursor-pointer ${validationErrors[index]?.project_id ? 'border-rose-500' : 'border-dark-600'}`}
                        disabled={isSaving}
                        aria-required="true"
                        aria-invalid={!!validationErrors[index]?.project_id}
                      >
                        <option value="">בחר פרויקט... (חובה)</option>
                        {projectOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.areaName} › {opt.name}</option>
                        ))}
                      </select>
                      {validationErrors[index]?.project_id && (
                        <p className="text-rose-500 text-[11px] font-semibold mt-1" role="alert">{validationErrors[index].project_id}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-4 border-t border-dark-600/50 pt-6">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-all"
          disabled={isSaving}
        >
          ביטול
        </button>
        <button
          onClick={handleConfirmSave}
          className={`flex items-center justify-center gap-2 px-8 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm border border-transparent ${isShaking ? 'animate-shake border-rose-500 ring-2 ring-rose-500/50' : ''}`}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
          <span>שמירת משימות</span>
          {totalErrors > 0 && (
            <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-md font-bold animate-pulse">{totalErrors} שגיאות</span>
          )}
        </button>
      </div>

      {isModalOpen && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          projectId={projectOptions[0]?.id || null}
          onSuccess={handleAddTaskSuccess}
        />
      )}

      {taskToDeleteIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-task-modal-title"
          aria-describedby="delete-task-modal-desc"
        >
          <div className="relative w-full max-w-md bg-white border border-dark-600 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-800 mb-4" aria-hidden="true">
              <AlertTriangle className="w-6 h-6 text-rose-800 motion-safe:animate-pulse" />
            </div>

            <h3 id="delete-task-modal-title" className="text-lg font-bold text-center text-emerald-950 mb-2">
              אישור מחיקת משימה
            </h3>

            <p id="delete-task-modal-desc" className="text-sm text-slate-800 text-center leading-relaxed mb-6 font-medium">
              האם אתם בטוחים שברצונכם למחוק את המשימה <strong>"{editedTasks[taskToDeleteIndex]?.title || 'ללא שם'}"</strong>? פעולה זו היא סופית.
            </p>

            <div className="flex justify-center gap-3 pt-4 border-t border-dark-600/70">
              <button
                type="button"
                onClick={() => setTaskToDeleteIndex(null)}
                className="px-5 py-2 text-sm text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={async () => {
                  const idx = taskToDeleteIndex;
                  setTaskToDeleteIndex(null);
                  await handleRemoveTask(idx);
                }}
                className="flex items-center justify-center gap-2 px-6 py-2 text-sm font-bold bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white! rounded-xl shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-800"
              >
                מחיקת משימה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}