import React, { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Trash2
} from 'lucide-react';
import TaskModal from './TaskModal';

const formatDate = (dateStr) => {
  if (!dateStr) return '';

  const parts = dateStr.split('-');

  if (parts.length === 3) {
    const y = parts[0].slice(-2);
    const m = parts[1];
    const d = parts[2];

    return `${d}/${m}/${y}`;
  }

  return dateStr;
};

export default function KanbanBoard({ projectId, tasks, onRefresh }) {
  const [localTasks, setLocalTasks] = useState([]);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleDeleteTaskConfirm = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`http://localhost:3001/api/tasks/${taskToDelete.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'שגיאה במחיקת המשימה');
      }

      setTaskToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      setDeleteError(err.message || 'מחיקת המשימה נכשלה');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const columns = ['טרם התחיל', 'בביצוע', 'הושלם'];

  const projectTasks = localTasks.filter(t => t.project_id === projectId);

  const isOverdue = (task) => {
    if (task.status === 'הושלם' || !task.due_date) return false;

    const dueDateObj = new Date(task.due_date);

    if (isNaN(dueDateObj.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return dueDateObj < today;
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const updateTaskStatus = async (task, targetStatus) => {
    if (!task || task.status === targetStatus || updatingTaskId === task.id) {
      return;
    }

    const originalTasks = [...localTasks];

    setUpdatingTaskId(task.id);
    setError(null);
    setStatusMessage(`המשימה "${task.title}" מועברת לסטטוס ${targetStatus}`);

    setLocalTasks(prev =>
      prev.map(t =>
        t.id === task.id
          ? { ...t, status: targetStatus }
          : t
      )
    );

    try {
      const response = await fetch(`http://localhost:3001/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });

      if (!response.ok) {
        throw new Error('API update failed');
      }

      setStatusMessage(`המשימה "${task.title}" הועברה לסטטוס ${targetStatus}`);

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('[Kanban] Status update failed:', err);

      setLocalTasks(originalTasks);
      setError('עדכון הסטטוס נכשל בשל בעיית רשת');
      setStatusMessage(`עדכון הסטטוס של המשימה "${task.title}" נכשל`);

      setTimeout(() => {
        setError(null);
      }, 4000);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();

    const taskIdStr = e.dataTransfer.getData('text/plain');

    if (!taskIdStr) return;

    const taskId = Number(taskIdStr);
    const taskToMove = localTasks.find(t => t.id === taskId);

    if (!taskToMove) return;

    await updateTaskStatus(taskToMove, targetStatus);
  };

  const getColumnDotClass = (colStatus) => {
    if (colStatus === 'טרם התחיל') return 'bg-slate-600';
    if (colStatus === 'בביצוע') return 'bg-amber-500';
    return 'bg-emerald-800';
  };

  const getPriorityClasses = (priority) => {
    if (priority === 'גבוהה') {
      return 'bg-rose-100 text-rose-800';
    }

    if (priority === 'בינונית') {
      return 'bg-amber-100 text-amber-800';
    }

    return 'bg-emerald-100 text-emerald-800';
  };

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* Screen-reader live status */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage}
      </div>

      {/* Kanban Header / Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-emerald-950">
          לוח משימות פרויקט
        </h3>

        <button
          type="button"
          onClick={openCreateModal}
          className="group flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-900 hover:text-emerald-950 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800"
          aria-label="הוספת משימה חדשה לפרויקט"
        >
          <Plus
            className="w-4 h-4 transition-transform duration-200 group-hover:scale-110"
            aria-hidden="true"
          />
          <span>הוספת משימה</span>
        </button>
      </div>

      {/* Network Error Alert */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-rose-50 text-rose-800 rounded-2xl flex items-center gap-3 text-sm font-semibold shadow-sm motion-safe:animate-shake"
        >
          <AlertTriangle
            className="w-5 h-5 shrink-0 text-rose-800"
            aria-hidden="true"
          />
          <span>{error}</span>
        </div>
      )}

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {columns.map((colStatus, index) => {
          const colTasks = projectTasks.filter(t => t.status === colStatus);
          const columnTitleId = `kanban-column-${index}`;

          return (
            <section
              key={colStatus}
              role="region"
              aria-labelledby={columnTitleId}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, colStatus)}
              className="bg-white/70 rounded-3xl p-5 min-h-[500px] flex flex-col space-y-4 transition-all duration-200 hover:bg-white hover:shadow-md"
            >
              {/* Column Header */}
              <div className="flex justify-between items-center pb-2 border-b border-dark-600/70 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${getColumnDotClass(colStatus)}`}
                    aria-hidden="true"
                  />

                  <h4
                    id={columnTitleId}
                    className="text-sm font-bold text-emerald-950"
                  >
                    {colStatus}
                  </h4>
                </div>

                <span className="text-xs bg-emerald-100 px-2 py-0.5 rounded-full text-emerald-800 font-bold">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks Cards Container */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-0.5">
                {colTasks.length === 0 ? (
                  <div className="text-center py-12 text-slate-700 text-xs border border-dashed border-dark-600/80 rounded-2xl bg-white/40 font-medium">
                    גררו משימות לכאן או העבירו אותן <br /> באמצעות תפריט הסטטוס בכרטיס.
                  </div>
                ) : (
                  colTasks.map(task => {
                    const overdue = isOverdue(task);
                    const isUpdating = updatingTaskId === task.id;
                    const statusSelectId = `task-status-${task.id}`;

                    return (
                      <div
                        key={task.id}
                        draggable={!isUpdating}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => openEditModal(task)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openEditModal(task);
                          }
                        }}
                        className={`group bg-white p-4 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden select-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800 ${overdue
                          ? 'ring-2 ring-inset ring-rose-700/40 bg-rose-50'
                          : 'hover:bg-emerald-50/40'
                          }`}
                        aria-label={`משימה ${task.title}, סטטוס ${task.status}, עדיפות ${task.priority}. לחצו לפתיחת פרטי משימה ועריכה`}
                      >
                        <div className="space-y-3">
                          {/* Priority, Warning and Delete row */}
                          <div className="flex justify-between items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPriorityClasses(task.priority)}`}>
                              עדיפות {task.priority}
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {overdue && (
                                <div className="flex items-center gap-1 text-[10px] text-rose-800 font-bold bg-rose-100 px-2 py-0.5 rounded-full motion-safe:animate-pulse">
                                  <AlertCircle
                                    className="w-3.5 h-3.5 shrink-0 text-rose-800"
                                    aria-hidden="true"
                                  />
                                  <span>פיגור</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTaskToDelete(task);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150 min-w-[24px] min-h-[24px] flex items-center justify-center"
                                aria-label={`מחק משימה ${task.title}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          {/* Title */}
                          <h5 className="text-sm font-bold text-emerald-950 leading-snug group-hover:text-emerald-800 transition-colors">
                            {task.title}
                          </h5>

                          {/* Description */}
                          {task.description && (
                            <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed font-medium">
                              {task.description}
                            </p>
                          )}

                          {/* Due Date */}
                          {task.due_date && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-800 pt-1.5 border-t border-dark-600/70 font-medium">
                              <Calendar
                                className="w-3.5 h-3.5 text-slate-800"
                                aria-hidden="true"
                              />
                              <span>יעד: {formatDate(task.due_date)}</span>
                            </div>
                          )}

                          {/* Accessible status move control */}
                          <div className="pt-2 border-t border-dark-600/70">
                            <label
                              htmlFor={statusSelectId}
                              className="block text-[11px] font-bold text-slate-800 mb-1"
                            >
                              העברת משימה לסטטוס
                            </label>

                            <div className="flex items-center gap-2">
                              <select
                                id={statusSelectId}
                                value={task.status}
                                disabled={isUpdating}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateTaskStatus(task, e.target.value)}
                                className="w-full rounded-xl border border-dark-600 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-700 disabled:opacity-70 disabled:cursor-wait"
                                aria-label={`שינוי סטטוס עבור המשימה ${task.title}`}
                              >
                                {columns.map(status => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>

                              {isUpdating && (
                                <Loader2
                                  className="w-4 h-4 animate-spin text-emerald-800 shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Task Edit/Create Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={editingTask}
        projectId={projectId}
        onSuccess={onRefresh}
      />

      {taskToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-955/80 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-task-title"
          aria-describedby="delete-task-desc"
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
              id="delete-task-title"
              className="text-lg font-bold text-center text-emerald-950 mb-2"
            >
              אישור מחיקת משימה
            </h3>

            <p
              id="delete-task-desc"
              className="text-sm text-slate-800 text-center leading-relaxed font-medium mb-6"
            >
              האם אתם בטוחים שברצונכם למחוק את המשימה <strong className="text-emerald-950">"{taskToDelete.title}"</strong> לצמיתות?
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
                  setTaskToDelete(null);
                  setDeleteError(null);
                }}
                className="px-5 py-2 text-sm text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteTaskConfirm}
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