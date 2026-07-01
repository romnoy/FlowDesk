import React, { useState, useEffect, useId, useRef } from 'react';
import { X, Loader2, AlertTriangle, Trash2, Calendar } from 'lucide-react';

export default function TaskModal({ isOpen, onClose, task, projectId, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('בינונית');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorField, setErrorField] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [dueDateInput, setDueDateInput] = useState('');
  const datePickerRef = useRef(null);

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

  const handleDateTextInputChange = (e) => {
    const val = e.target.value;
    setDueDateInput(val);
    const dbFormat = parseInputDateToDb(val);
    if (dbFormat) {
      setDueDate(dbFormat);
    }
  };

  const handleDateTextInputBlur = () => {
    if (!dueDateInput) {
      setDueDate('');
      return;
    }
    const dbFormat = parseInputDateToDb(dueDateInput);
    if (dbFormat) {
      setDueDate(dbFormat);
      setDueDateInput(formatDbDateToInput(dbFormat));
    } else {
      setDueDate('');
    }
  };

  const handleDatePickerChange = (val) => {
    setDueDate(val);
    setDueDateInput(formatDbDateToInput(val));
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`http://localhost:3001/api/tasks/${task.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'אירעה שגיאה במחיקת המשימה');
      }

      setShowDeleteConfirm(false);
      onSuccess({ deletedTaskId: task.id });
      onClose();
    } catch (err) {
      setDeleteError(err.message || 'מחיקת המשימה נכשלה');
    } finally {
      setIsDeleting(false);
    }
  };

  const componentId = useId();
  const titleId = `${componentId}-title`;
  const descId = `${componentId}-desc`;
  const priorityId = `${componentId}-priority`;
  const dueDateId = `${componentId}-due-date`;
  const modalTitleId = `${componentId}-modal-title`;
  const errorId = `${componentId}-error`;

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title || '');
        setDescription(task.description || '');
        setPriority(task.priority || 'בינונית');
        setDueDate(task.due_date || '');
        setDueDateInput(formatDbDateToInput(task.due_date));
      } else {
        setTitle('');
        setDescription('');
        setPriority('בינונית');
        setDueDate('');
        setDueDateInput('');
      }

      setError(null);
      setErrorField(null);
      setIsLoading(false);
      setShowDeleteConfirm(false);
      setIsDeleting(false);
      setDeleteError(null);
    }
  }, [isOpen, task]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('יש להזין שם משימה');
      setErrorField('title');
      return;
    }

    if (!description.trim()) {
      setError('יש להזין תיאור');
      setErrorField('description');
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorField(null);

    const isEdit = !!task;
    const url = isEdit
      ? `http://localhost:3001/api/tasks/${task.id}`
      : 'http://localhost:3001/api/tasks';

    const body = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
      project_id: projectId
    };

    try {
      const response = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'אירעה שגיאה בשמירת המשימה');
      }

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message || 'אירעה שגיאה בשמירת המשימה');
      setErrorField(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);

    if (errorField === 'title') {
      setError(null);
      setErrorField(null);
    }
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);

    if (errorField === 'description') {
      setError(null);
      setErrorField(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
    >
      <div className="relative w-full max-w-lg bg-white border border-dark-600 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3
            id={modalTitleId}
            className="text-lg font-bold text-emerald-950"
          >
            {task ? 'פרטי ועריכת משימה' : 'יצירת משימה'}
          </h3>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="סגור חלון"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div
            id={errorId}
            className="mb-4 p-3 bg-rose-50 border border-rose-700 text-rose-800 rounded-2xl text-xs font-semibold"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor={titleId}
              className="text-xs font-semibold text-slate-800"
            >
              שם המשימה{' '}
              <span className="text-rose-700 font-bold" aria-hidden="true">
                *
              </span>
              <span className="sr-only">שדה חובה</span>
            </label>

            <input
              id={titleId}
              type="text"
              placeholder="הזינו שם משימה..."
              value={title}
              onChange={handleTitleChange}
              className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-700 focus:outline-none focus:border-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-wait ${errorField === 'title'
                ? 'border-rose-700'
                : 'border-dark-600'
                }`}
              disabled={isLoading}
              autoFocus
              aria-required="true"
              aria-invalid={errorField === 'title'}
              aria-describedby={errorField === 'title' ? errorId : undefined}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={descId}
              className="text-xs font-semibold text-slate-800"
            >
              תיאור{' '}
              <span className="text-rose-700 font-bold" aria-hidden="true">
                *
              </span>
              <span className="sr-only">שדה חובה</span>
            </label>

            <textarea
              id={descId}
              placeholder="הזינו תיאור או הערות..."
              value={description}
              onChange={handleDescriptionChange}
              rows={3}
              className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-700 focus:outline-none focus:border-emerald-700 transition-colors resize-none disabled:opacity-70 disabled:cursor-wait ${errorField === 'description'
                ? 'border-rose-700'
                : 'border-dark-600'
                }`}
              disabled={isLoading}
              aria-required="true"
              aria-invalid={errorField === 'description'}
              aria-describedby={errorField === 'description' ? errorId : undefined}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor={priorityId}
                className="text-xs font-semibold text-slate-800"
              >
                עדיפות
              </label>

              <select
                id={priorityId}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-white border border-dark-600 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-wait"
                disabled={isLoading}
              >
                <option value="גבוהה">גבוהה</option>
                <option value="בינונית">בינונית</option>
                <option value="נמוכה">נמוכה</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={dueDateId}
                className="text-xs font-semibold text-slate-800"
              >
                תאריך יעד
              </label>

              <div className="relative">
                <input
                  id={dueDateId}
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={dueDateInput}
                  onChange={handleDateTextInputChange}
                  onBlur={handleDateTextInputBlur}
                  className="w-full bg-white border border-dark-600 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-wait"
                  disabled={isLoading}
                />
                
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center pointer-events-none">
                  <Calendar className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </div>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDatePickerChange(e.target.value)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 cursor-pointer"
                  disabled={isLoading}
                  title="בחר תאריך מלוח שנה"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-dark-600/70 mt-6">
            {task ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm font-bold text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-xl transition-colors"
                disabled={isLoading}
              >
                מחיקת משימה
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                ביטול
              </button>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold bg-[#047857] hover:bg-[#065f46] active:bg-[#064e3b] text-white! rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-wait"
                disabled={isLoading}
              >
                {isLoading && (
                  <Loader2
                    className="w-4 h-4 animate-spin text-white!"
                    aria-hidden="true"
                  />
                )}

                <span className="text-white!">
                  {task ? 'שמירת שינויים' : 'יצירת משימה'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-dark-955/80 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-task-title"
          aria-describedby="delete-modal-task-desc"
        >
          <div className="relative w-full max-w-md bg-white border border-dark-600 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div
              className="mx-auto w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-800 mb-4"
              aria-hidden="true"
            >
              <AlertTriangle
                className="w-6 h-6 text-rose-800 motion-safe:animate-pulse"
                aria-hidden="true"
              />
            </div>

            <h3
              id="delete-modal-task-title"
              className="text-lg font-bold text-center text-emerald-950 mb-2"
            >
              אישור מחיקת משימה
            </h3>

            <p
              id="delete-modal-task-desc"
              className="text-sm text-slate-800 text-center leading-relaxed font-medium mb-6"
            >
              האם אתם בטוחים שברצונכם למחוק את המשימה <strong className="text-emerald-950">"{title}"</strong> לצמיתות?
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold text-center">
                {deleteError}
              </div>
            )}

            <div className="flex justify-center gap-3 pt-4 border-t border-dark-600/70">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                }}
                className="px-5 py-2 text-sm text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex items-center justify-center gap-2 px-6 py-2 text-sm font-bold bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white! rounded-xl shadow-md transition-all disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-800"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>מוחק...</span>
                  </>
                ) : (
                  <span>מחיקה לצמיתות</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}