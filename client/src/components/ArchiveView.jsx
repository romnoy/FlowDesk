import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  FileText,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Trash2,
  AlertTriangle
} from 'lucide-react';

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

export default function ArchiveView({ hierarchy, onNavigateToProject }) {
  const [transcripts, setTranscripts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [taskErrors, setTaskErrors] = useState({});
  const [transcriptToDelete, setTranscriptToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleDeleteConfirm = async () => {
    if (!transcriptToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`http://localhost:3001/api/transcripts/${transcriptToDelete.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'שגיאה במחיקת התמלול');
      }

      // Success
      if (selectedTranscript && selectedTranscript.id === transcriptToDelete.id) {
        setSelectedTranscript(null);
      }
      setTranscriptToDelete(null);
      fetchTranscripts(searchQuery);
    } catch (err) {
      console.error(err);
      setDeleteError(err.message || 'מחיקת התמלול נכשלה');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchTranscripts = async (query = '') => {
    setIsLoading(true);
    setError(null);

    try {
      const url = query.trim() !== ''
        ? `http://localhost:3001/api/transcripts?q=${encodeURIComponent(query)}`
        : 'http://localhost:3001/api/transcripts';

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error('שגיאה בטעינת ארכיון התמלולים');
      }

      const data = await res.json();
      setTranscripts(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'חיבור לשרת נכשל');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTranscripts();
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;

    setSearchQuery(val);
    fetchTranscripts(val);
  };

  const handleViewDetails = async (id) => {
    if (detailLoading) return;

    setDetailLoading(true);
    setTaskErrors({});
    setError(null);

    try {
      const res = await fetch(`http://localhost:3001/api/transcripts/${id}`);

      if (!res.ok) {
        throw new Error('שגיאה בטעינת פרטי התמלול');
      }

      const data = await res.json();
      setSelectedTranscript(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'לא ניתן לטעון פרטי פגישה');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTaskClick = async (task) => {
    try {
      const res = await fetch(`http://localhost:3001/api/tasks/${task.id}`);

      if (res.status === 404) {
        setTaskErrors(prev => ({
          ...prev,
          [task.id]: 'המשימה אינה קיימת יותר'
        }));

        setTimeout(() => {
          setTaskErrors(prev => {
            const copy = { ...prev };
            delete copy[task.id];
            return copy;
          });
        }, 3000);

        return;
      }

      if (!res.ok) {
        throw new Error();
      }

      const taskData = await res.json();

      if (onNavigateToProject) {
        onNavigateToProject(taskData.project_id);
      }
    } catch (err) {
      setTaskErrors(prev => ({
        ...prev,
        [task.id]: 'המשימה אינה קיימת יותר'
      }));
    }
  };

  const getProjectName = (projId) => {
    if (!projId) return 'כללי';

    for (const area of hierarchy) {
      if (area.projects) {
        const found = area.projects.find(p => p.id === projId);

        if (found) {
          return `${area.name} › ${found.name}`;
        }
      }
    }

    return 'פרויקט לא ידוע';
  };

  const getProjectColor = (projId) => {
    const colors = [
      '#2563EB',
      '#047857',
      '#B45309',
      '#DB2777',
      '#7C3AED',
      '#0891B2',
      '#DC2626',
      '#0F766E',
      '#C2410C',
      '#4F46E5'
    ];

    if (!projId) return '#64748B';

    let count = 0;

    for (const area of hierarchy) {
      if (area.projects) {
        for (const p of area.projects) {
          if (p.id === projId) {
            return colors[count % colors.length];
          }

          count++;
        }
      }
    }

    return '#64748B';
  };

  const getTranscriptStatusLabel = (status) => {
    if (status === 'completed') return 'מעובד';
    if (status === 'processing') return 'בסריקה...';
    return 'נכשל';
  };

  const getTranscriptStatusClasses = (status) => {
    if (status === 'completed') {
      return 'bg-emerald-100 text-emerald-800';
    }

    if (status === 'processing') {
      return 'bg-amber-100 text-amber-800 animate-pulse';
    }

    return 'bg-rose-100 text-rose-800';
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

  const getTaskStatusClasses = (status) => {
    if (status === 'הושלם') {
      return 'bg-emerald-100 text-emerald-800';
    }

    if (status === 'בביצוע') {
      return 'bg-amber-100 text-amber-800';
    }

    return 'bg-slate-200 text-slate-800';
  };

  return (
    <div className="w-full space-y-6" dir="rtl">
      {selectedTranscript ? (
        /* ================= DETAIL VIEW ================= */
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-200">
          {/* Back Header */}
          <div className="flex items-center justify-between pb-4 border-b border-dark-600/60">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedTranscript(null)}
                className="group flex items-center gap-2 text-sm text-emerald-800 hover:text-emerald-950 font-semibold transition-all duration-200 rounded-xl px-3 py-2 hover:bg-emerald-100 hover:shadow-sm active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800"
                aria-label="חזרה לרשימת ארכיון התמלולים"
              >
                <ArrowLeft
                  className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
                <span>חזרה לארכיון</span>
              </button>

              <button
                type="button"
                onClick={() => setTranscriptToDelete(selectedTranscript)}
                className="group flex items-center gap-2 text-sm text-rose-800 hover:text-rose-950 font-semibold transition-all duration-200 rounded-xl px-3 py-2 hover:bg-rose-50 hover:shadow-sm active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-800"
                aria-label={`מחק תמלול ${selectedTranscript.title}`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>מחיקת תמלול</span>
              </button>
            </div>

            <span className="text-xs text-slate-800 font-medium">
              תאריך העלאה:{' '}
              {new Date(selectedTranscript.created_at).toLocaleDateString('he-IL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Summary & Tasks */}
            <div className="lg:col-span-2 space-y-6">
              {/* Meeting Summary */}
              <section
                className="bg-white rounded-3xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200 relative overflow-hidden flex flex-col h-[350px] justify-between"
                aria-labelledby="archive-summary-title"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800"
                      aria-hidden="true"
                    >
                      <FileText className="w-5 h-5" aria-hidden="true" />
                    </div>

                    <div>
                      <h3
                        id="archive-summary-title"
                        className="text-base font-bold text-emerald-950"
                      >
                        סיכום המפגש מבוסס AI
                      </h3>

                      <p className="text-[11px] text-slate-800 font-medium">
                        תקציר הנושאים וההחלטות המרכזיות
                      </p>
                    </div>
                  </div>

                  <div className="bg-dark-900 p-4 rounded-2xl border border-dark-600/70 overflow-y-auto max-h-[220px] text-sm text-slate-900 leading-relaxed font-medium">
                    {selectedTranscript.structured_analysis?.summary || 'לא נוצר סיכום לתמלול זה.'}
                  </div>
                </div>
              </section>

              {/* Tasks List */}
              <section
                className="bg-white rounded-3xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200"
                aria-labelledby="archive-linked-tasks-title"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3
                      id="archive-linked-tasks-title"
                      className="text-base font-bold text-emerald-950"
                    >
                      משימות משויכות
                    </h3>
                  </div>

                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">
                    {selectedTranscript.tasks?.length || 0} משימות
                  </span>
                </div>

                {(!selectedTranscript.tasks || selectedTranscript.tasks.length === 0) ? (
                  <div className="text-center py-8 text-slate-800 text-sm font-medium">
                    לא נמצאו משימות שמורות בבסיס הנתונים עבור תמלול זה.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedTranscript.tasks.map(task => {
                      const hasErr = taskErrors[task.id];

                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleTaskClick(task)}
                          className="group w-full bg-dark-900 hover:bg-white p-4 rounded-2xl flex items-center justify-between transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800"
                          aria-label={`מעבר לפרויקט של המשימה: ${task.title}`}
                        >
                          <span className="block space-y-1.5 flex-1 pl-4">
                            <span className="flex items-center gap-2">
                              <span className="text-sm font-bold text-emerald-950 group-hover:text-emerald-800 transition-colors">
                                {task.title}
                              </span>

                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getPriorityClasses(task.priority)}`}>
                                {task.priority}
                              </span>
                            </span>

                            {task.description && (
                              <span className="block text-xs text-slate-800 line-clamp-1">
                                {task.description}
                              </span>
                            )}

                            <span className="flex items-center gap-4 text-[11px] text-slate-800 font-medium">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: getProjectColor(task.project_id) }}
                                  aria-hidden="true"
                                />
                                <span>{getProjectName(task.project_id)}</span>
                              </span>

                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar
                                    className="w-3 h-3 text-slate-800"
                                    aria-hidden="true"
                                  />
                                  <span>יעד: {formatDate(task.due_date)}</span>
                                </span>
                              )}
                            </span>
                          </span>

                          <span className="flex items-center gap-3 shrink-0">
                            {hasErr ? (
                              <span
                                role="alert"
                                className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-lg"
                              >
                                {hasErr}
                              </span>
                            ) : (
                              <>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${getTaskStatusClasses(task.status)}`}>
                                  {task.status}
                                </span>

                                <ExternalLink
                                  className="w-4 h-4 text-emerald-800 group-hover:text-emerald-950 transition-colors"
                                  aria-hidden="true"
                                />
                              </>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Original Raw Text */}
            <div className="space-y-6 h-full">
              <section
                className="bg-white rounded-3xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col h-full justify-between"
                aria-labelledby="archive-raw-text-title"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-dark-600/70 mb-4">
                    <h3
                      id="archive-raw-text-title"
                      className="text-sm font-bold text-emerald-950"
                    >
                      תמלול מקורי
                    </h3>
                  </div>

                  <div className="bg-dark-900 p-4 rounded-2xl border border-dark-600/70 overflow-y-auto max-h-[450px] text-xs text-slate-900 leading-relaxed whitespace-pre-wrap font-mono">
                    {selectedTranscript.raw_text}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : (
        /* ================= HISTORICAL LIST VIEW ================= */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Search Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-emerald-950">
                ארכיון תמלולים
              </h3>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-80 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <span
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-emerald-800"
                aria-hidden="true"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
              </span>

              <input
                type="text"
                aria-label="חיפוש בארכיון התמלולים"
                aria-controls="transcripts-results"
                placeholder="חפשו בכותרות התמלולים ובתקצירים..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full bg-transparent border border-dark-600/70 hover:border-emerald-700 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 placeholder-slate-700 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {isLoading
              ? 'טוען ארכיון תמלולים'
              : `${transcripts.length} תמלולים נמצאו${searchQuery ? ' לפי החיפוש' : ''}`}
          </div>

          {detailLoading && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 text-sm text-slate-800 font-medium"
            >
              <Loader2 className="w-4 h-4 animate-spin text-emerald-800" aria-hidden="true" />
              <span>טוען פרטי תמלול...</span>
            </div>
          )}

          {/* Loader or Error or Results */}
          {isLoading ? (
            <div
              className="flex flex-col items-center justify-center py-20 text-slate-800 gap-3"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2
                className="w-8 h-8 animate-spin text-emerald-800"
                aria-hidden="true"
              />
              <p className="text-xs font-medium">טוען ארכיון תמלולים...</p>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="bg-rose-50 border border-rose-700 p-4 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold"
            >
              <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : transcripts.length === 0 ? (
            <div className="bg-white border border-dark-600/70 border-dashed p-16 rounded-3xl text-center flex flex-col items-center justify-center shadow-sm">
              <div
                className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-emerald-800"
                aria-hidden="true"
              >
                <Search className="w-6 h-6" aria-hidden="true" />
              </div>

              {searchQuery.trim() === '' ? (
                <>
                  <h4 className="text-base font-bold text-emerald-950">
                    לא קיימים תמלולים
                  </h4>
                  <p className="text-xs text-slate-800 max-w-sm mt-1.5 font-medium">
                    העלו תמלול חדש כדי להתחיל
                  </p>
                </>
              ) : (
                <>
                  <h4 className="text-base font-bold text-emerald-950">
                    לא נמצאו תמלולים התואמים לחיפוש
                  </h4>
                  <p className="text-xs text-slate-800 max-w-sm mt-1.5 font-medium">
                    נסו לשנות את מילת המפתח או להעלות קובץ תמלול פגישה חדש כדי להתחיל.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div
              id="transcripts-results"
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              aria-label="תוצאות ארכיון התמלולים"
            >
              {transcripts.map(tr => (
                <div
                  key={tr.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleViewDetails(tr.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleViewDetails(tr.id);
                    }
                  }}
                  className="group w-full bg-white p-6 rounded-3xl shadow-md hover:shadow-xl hover:-translate-y-1 hover:bg-emerald-50/50 transition-all duration-200 flex flex-col justify-between min-h-[180px] relative overflow-hidden text-right cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800"
                  aria-label={`פרטי התמלול: ${tr.title}`}
                >
                  <span className="block space-y-3">
                    {/* Header */}
                    <span className="flex justify-between items-start gap-2">
                      <span className="flex items-center gap-2 overflow-hidden pl-2">
                        <FileText
                          className="w-4 h-4 text-emerald-800 shrink-0 transition-colors group-hover:text-emerald-950"
                          aria-hidden="true"
                        />

                        <span className="block text-sm font-bold text-emerald-950 truncate leading-snug group-hover:text-emerald-800 transition-colors">
                          {tr.title}
                        </span>
                      </span>

                      {/* Status badge & delete */}
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getTranscriptStatusClasses(tr.status)}`}>
                          {getTranscriptStatusLabel(tr.status)}
                        </span>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTranscriptToDelete(tr);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150 min-w-[24px] min-h-[24px] flex items-center justify-center"
                          aria-label={`מחק תמלול ${tr.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    </span>

                    {/* Summary Excerpt */}
                    {tr.structured_analysis?.summary ? (
                      <span className="block text-xs text-slate-800 line-clamp-3 leading-relaxed font-medium">
                        {tr.structured_analysis.summary}
                      </span>
                    ) : (
                      <span className="block text-xs text-slate-800 italic font-medium">
                        {tr.status === 'processing'
                          ? 'מעבד תמלול ונקודות מפתח...'
                          : 'לא נמצאו נתוני סיכום מובנים.'}
                      </span>
                    )}
                  </span>

                  {/* Footer metadata */}
                  <span className="flex justify-between items-center pt-4 border-t border-dark-600/70 mt-4 text-[11px] text-slate-800 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-800" aria-hidden="true" />
                      <span>{new Date(tr.created_at).toLocaleDateString('he-IL')}</span>
                    </span>

                    <span className="flex items-center gap-1 text-emerald-800 group-hover:text-emerald-950 font-bold transition-colors">
                      <span>צפו בפרטים</span>
                      <ArrowLeft
                        className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {transcriptToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-955/80 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-transcript-title"
          aria-describedby="delete-transcript-desc"
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
              id="delete-transcript-title"
              className="text-lg font-bold text-center text-emerald-950 mb-2"
            >
              אישור מחיקת תמלול
            </h3>

            <p
              id="delete-transcript-desc"
              className="text-sm text-slate-800 text-center leading-relaxed font-medium"
            >
              האם אתם בטוחים שברצונכם למחוק את התמלול <strong className="text-emerald-950">"{transcriptToDelete.title}"</strong>?
            </p>

            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-amber-800 text-xs font-semibold mt-4 text-right flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
              <div>
                <strong>שימו לב:</strong> מחיקת התמלול לא תמחק את המשימות שנוצרו ממנו, אך תסיר את הקישור אליו.
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold text-center">
                {deleteError}
              </div>
            )}

            <div className="flex justify-center gap-3 pt-4 border-t border-dark-600/70 mt-6">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setTranscriptToDelete(null);
                  setDeleteError(null);
                }}
                className="px-5 py-2 text-sm text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
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