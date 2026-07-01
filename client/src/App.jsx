import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutGrid, CheckSquare, FileText, Archive, Plus, Clock,
  AlertCircle, TrendingUp, Folder, Trash2, ChevronLeft, ChevronDown, Loader2,
  Triangle, Circle
} from 'lucide-react';
import UploadZone from './components/UploadZone';
import CreateHierarchyModal from './components/CreateHierarchyModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import KanbanBoard from './components/KanbanBoard';
import ApprovalScreen from './components/ApprovalScreen';
import ArchiveView from './components/ArchiveView';
import TaskModal from './components/TaskModal';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
  }
  return dateStr;
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hierarchy, setHierarchy] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [pendingApprovalTranscript, setPendingApprovalTranscript] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState('area');
  const [createParentId, setCreateParentId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteType, setDeleteType] = useState('area');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [expandedAreas, setExpandedAreas] = useState({});
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [colFilterTitle, setColFilterTitle] = useState('');
  const [colFilterProject, setColFilterProject] = useState('');
  const [colFilterPriority, setColFilterPriority] = useState('');
  const [colFilterStatus, setColFilterStatus] = useState('');
  const [colFilterDueDate, setColFilterDueDate] = useState('');
  const [activeFilterPopover, setActiveFilterPopover] = useState(null);
  const [hoveredAreaId, setHoveredAreaId] = useState(null);
  const lastFocusedFilterBtn = useRef(null);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitAction, setExitAction] = useState(null);

  const confirmNavigation = useCallback((action) => {
    if (activeTab === 'upload' && pendingApprovalTranscript) {
      setExitAction(() => () => {
        setPendingApprovalTranscript(null);
        action();
      });
      setShowExitConfirm(true);
    } else {
      action();
    }
  }, [activeTab, pendingApprovalTranscript]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showExitConfirm) {
        setShowExitConfirm(false);
        setExitAction(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showExitConfirm]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (activeTab === 'upload' && pendingApprovalTranscript) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeTab, pendingApprovalTranscript]);

  const closeFilterPopover = useCallback(() => {
    setActiveFilterPopover(null);
    if (lastFocusedFilterBtn.current) {
      lastFocusedFilterBtn.current.focus();
      lastFocusedFilterBtn.current = null;
    }
  }, []);

  const openFilterPopover = useCallback((name, btnElement) => {
    lastFocusedFilterBtn.current = btnElement;
    setActiveFilterPopover(prev => prev === name ? null : name);
  }, []);

  const toggleAreaExpand = (areaId) => {
    setExpandedAreas(prev => ({ ...prev, [areaId]: prev[areaId] === false ? true : false }));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeFilterPopover) closeFilterPopover();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeFilterPopover, closeFilterPopover]);

  const fetchHierarchy = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/hierarchy');
      const data = await res.json();
      if (res.ok) setHierarchy(data);
    } catch (err) { console.error('Failed to fetch hierarchy:', err); }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/tasks');
      const data = await res.json();
      if (res.ok) setTasks(data);
    } catch (err) { console.error('Failed to fetch tasks:', err); }
  };

  const handleUploadSuccess = (transcript) => { fetchTasks(); setPendingApprovalTranscript(transcript); };

  useEffect(() => {
    setIsLoading(true);
    fetch('http://localhost:3001/api/health')
      .then(res => res.json())
      .then(data => { if (data.status === 'ok') return Promise.all([fetchHierarchy(), fetchTasks()]); })
      .catch(err => console.error('Health check failed:', err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (hierarchy.length > 0 && !selectedProjectId) {
      for (const area of hierarchy) {
        if (area.projects && area.projects.length > 0) { setSelectedProjectId(area.projects[0].id); break; }
      }
    }
  }, [hierarchy, selectedProjectId]);

  const selectProject = (projId) => {
    confirmNavigation(() => {
      setSelectedProjectId(projId);
      setActiveTab('board');
    });
  };
  const openCreateModal = (type, parentId = null) => { setCreateType(type); setCreateParentId(parentId); setIsCreateOpen(true); };
  const openDeleteModal = (type, id, name) => { setDeleteType(type); setDeleteId(id); setDeleteName(name); setIsDeleteOpen(true); };
  const handleCreateSuccess = (newData) => {
    fetchHierarchy();
    if (createType === 'project') {
      confirmNavigation(() => {
        setSelectedProjectId(newData.id);
        setActiveTab('board');
      });
    }
  };
  const handleDeleteSuccess = ({ targetType, targetId }) => { fetchHierarchy(); fetchTasks(); if (targetType === 'project' && selectedProjectId === targetId) setSelectedProjectId(null); };

  const openTasksCount = tasks.filter(t => t.status !== 'הושלם').length;
  const highPriorityCount = tasks.filter(t => t.priority === 'גבוהה' && t.status !== 'הושלם').length;
  const dueThisWeekCount = tasks.filter(t => {
    if (t.status === 'הושלם' || !t.due_date) return false;
    const d = new Date(t.due_date);
    if (isNaN(d.getTime())) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setDate(today.getDate() + 7); end.setHours(23, 59, 59, 999);
    return d >= today && d <= end;
  }).length;

  const notStartedCount = tasks.filter(t => t.status === 'טרם התחיל').length;
  const inProgressCount = tasks.filter(t => t.status === 'בביצוע').length;
  const completedCount = tasks.filter(t => t.status === 'הושלם').length;
  const totalProjects = hierarchy.reduce((acc, area) => acc + (area.projects ? area.projects.length : 0), 0);

  let accumulatedPercent = 0;
  const areaSlices = [];
  const areaColors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444'];
  hierarchy.forEach((area, i) => {
    const projCount = area.projects ? area.projects.length : 0;
    if (projCount > 0 && totalProjects > 0) {
      const pct = projCount / totalProjects;
      areaSlices.push({ id: area.id, name: area.name, count: projCount, percent: pct, color: areaColors[i % areaColors.length], accumulated: accumulatedPercent, projects: area.projects || [] });
      accumulatedPercent += pct;
    }
  });

  const getMatchTitle = (t) => colFilterTitle.trim() === '' || t.title.toLowerCase().includes(colFilterTitle.toLowerCase()) || (t.description && t.description.toLowerCase().includes(colFilterTitle.toLowerCase()));
  const getMatchProject = (t) => { if (colFilterProject === '') return true; if (colFilterProject === 'general') return !t.project_id; return String(t.project_id) === String(colFilterProject); };
  const getMatchPriority = (t) => colFilterPriority === '' || t.priority === colFilterPriority;
  const getMatchStatus = (t) => colFilterStatus === '' || t.status === colFilterStatus;
  const getMatchDueDate = (t) => {
    if (colFilterDueDate === '') return true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (colFilterDueDate === 'no-date') return !t.due_date;
    else if (!t.due_date) return false;
    const d = new Date(t.due_date); d.setHours(0, 0, 0, 0);
    if (colFilterDueDate === 'today') return t.due_date.split('T')[0] === today.toISOString().split('T')[0];
    if (colFilterDueDate === 'week') { const end = new Date(today); end.setDate(today.getDate() + 7); end.setHours(23, 59, 59, 999); return d >= today && d <= end; }
    if (colFilterDueDate === 'overdue') return d < today && t.status !== 'הושלם';
    return true;
  };

  const filteredTasks = tasks.filter(t => getMatchTitle(t) && getMatchProject(t) && getMatchPriority(t) && getMatchStatus(t) && getMatchDueDate(t));
  const tasksForProjectDropdown = tasks.filter(t => getMatchTitle(t) && getMatchPriority(t) && getMatchStatus(t) && getMatchDueDate(t));
  const tasksForPriorityDropdown = tasks.filter(t => getMatchTitle(t) && getMatchProject(t) && getMatchStatus(t) && getMatchDueDate(t));
  const tasksForStatusDropdown = tasks.filter(t => getMatchTitle(t) && getMatchProject(t) && getMatchPriority(t) && getMatchDueDate(t));
  const tasksForDueDateDropdown = tasks.filter(t => getMatchTitle(t) && getMatchProject(t) && getMatchPriority(t) && getMatchStatus(t));

  const allProjects = [];
  hierarchy.forEach(area => {
    if (area.projects) area.projects.forEach(proj => {
      if (tasksForProjectDropdown.some(t => String(t.project_id) === String(proj.id)) && !allProjects.some(p => p.id === proj.id)) allProjects.push(proj);
    });
  });

  const getProjectName = (projId) => {
    if (!projId) return 'פרויקט כללי';
    for (const area of hierarchy) { if (area.projects) { const f = area.projects.find(p => p.id === projId); if (f) return f.name; } }
    return 'פרויקט כללי';
  };

  const getProjectColor = (projId) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444', '#14B8A6', '#F97316', '#6366F1'];
    if (!projId) return '#64748B';
    let count = 0;
    for (const area of hierarchy) { if (area.projects) { for (const p of area.projects) { if (p.id === projId) return colors[count % colors.length]; count++; } } }
    return '#64748B';
  };

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 flex flex-row" dir="rtl">

      {/* Sidebar */}
      <aside className="w-64 bg-dark-800 border-l border-dark-600 flex flex-col justify-between p-6 h-screen overflow-hidden">
        <div className="flex flex-col h-[calc(100%-80px)] overflow-hidden">
          <div className="flex items-center gap-3 mb-8 px-2 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#047857] flex items-center justify-center shadow-md">
              <TrendingUp className="w-5 h-5 text-white!" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-primary-600">FlowDesk</h1>
              <span className="text-xs text-slate-200">Transcripts to Tasks</span>
            </div>
          </div>

          {/* FIX 5: sidebar nav text changed from slate-400 to slate-200 for contrast */}
          <nav className="space-y-1.5 shrink-0" aria-label="ניווט ראשי">
            {[
              { id: 'dashboard', label: 'לוח בקרה', icon: <LayoutGrid className="w-4.5 h-4.5" aria-hidden="true" /> },
              { id: 'upload', label: 'עיבוד תמלול', icon: <FileText className="w-4.5 h-4.5" aria-hidden="true" /> },
              { id: 'archive', label: 'ארכיון תמלולים', icon: <Archive className="w-4.5 h-4.5" aria-hidden="true" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => confirmNavigation(() => setActiveTab(tab.id))}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                  ? 'bg-primary-600/10 text-primary-500 border-r-2 border-primary-500'
                  : 'text-slate-200 hover:bg-dark-700 hover:text-slate-100'}`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8 border-t border-dark-600/50 pt-6 flex-1 overflow-y-auto pr-1">
            <div className="flex items-center justify-between px-2 mb-4">
              <span className="text-xs font-bold text-slate-200 tracking-wider">קטגוריות</span>
              <button
                onClick={() => openCreateModal('area', null)}
                className="p-1.5 min-w-[24px] min-h-[24px] rounded bg-dark-700 hover:bg-dark-600 text-slate-200 hover:text-white! transition-colors"
                aria-label="הוסף קטגוריה"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              {hierarchy.map(area => {
                const isAreaExpanded = expandedAreas[area.id] !== false;
                return (
                  <div key={area.id} className="space-y-1">
                    <div className="flex items-center justify-between group px-2 py-1 rounded hover:bg-dark-700/30">
                      <button
                        onClick={() => area.projects && area.projects.length > 0 && toggleAreaExpand(area.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold text-slate-200 text-right hover:text-white! transition-colors ${area.projects && area.projects.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                        aria-expanded={area.projects && area.projects.length > 0 ? isAreaExpanded : undefined}
                        aria-label={area.projects && area.projects.length > 0 ? `פתח/סגור קטגוריה ${area.name}` : undefined}
                      >
                        {area.projects && area.projects.length > 0 ? (
                          isAreaExpanded
                            ? <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            : <ChevronLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <span className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        )}
                        <span>{area.name}</span>
                      </button>
                      <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 flex items-center gap-1 transition-opacity">
                        <button onClick={() => openCreateModal('project', area.id)} className="p-1.5 min-w-[24px] min-h-[24px] text-slate-200 hover:text-white! transition-colors" aria-label={`הוסף פרויקט לקטגוריה ${area.name}`}>
                          <Plus className="w-3 h-3" aria-hidden="true" />
                        </button>
                        {area.name !== 'כללי' && (
                          <button onClick={() => openDeleteModal('area', area.id, area.name)} className="p-1.5 min-w-[24px] min-h-[24px] text-slate-200 hover:text-rose-600 transition-colors" aria-label={`מחק קטגוריה ${area.name}`}>
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isAreaExpanded && (
                      <div className="space-y-0.5 pr-2">
                        {area.projects && area.projects.map(proj => (
                          <div key={proj.id} className={`flex items-center justify-between group px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${activeTab === 'board' && selectedProjectId === proj.id
                            ? 'bg-primary-600/10 text-primary-500 font-semibold border-r-2 border-primary-500'
                            : 'text-slate-200 hover:bg-dark-700 hover:text-white!'}`}>
                            <button onClick={() => selectProject(proj.id)} className="flex-1 flex items-center gap-2 text-right overflow-hidden" aria-current={activeTab === 'board' && selectedProjectId === proj.id ? 'true' : undefined}>
                              <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: getProjectColor(proj.id) }} aria-hidden="true" />
                              <span className="truncate">{proj.name}</span>
                            </button>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity ml-1.5">
                              <button onClick={() => openDeleteModal('project', proj.id, proj.name)} className="p-1.5 min-w-[24px] min-h-[24px] text-slate-200 hover:text-rose-600 transition-colors" aria-label={`מחק פרויקט ${proj.name}`}>
                                <Trash2 className="w-3 h-3" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 flex flex-col justify-between overflow-y-auto h-screen">
        <div>
          <header className="flex justify-between items-center mb-10">
            {((activeTab === 'dashboard' && tasks.length > 0) || activeTab === 'archive') && (
              // FIX 4: Primary buttons use #047857 for 4.5:1 contrast with white text
              <button
                onClick={() => confirmNavigation(() => setActiveTab('upload'))}
                className="flex items-center gap-2 px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white! rounded-xl font-medium shadow-md transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 text-sm"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>הוספת תמלול</span>
              </button>
            )}
          </header>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-200 gap-4" aria-live="polite" aria-busy="true">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" aria-hidden="true" />
              <p className="text-sm">טוען נתונים מהשרת...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <div>
                  {tasks.length === 0 ? (
                    <div className="bg-dark-800 border border-dark-600 p-12 rounded-3xl text-center flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
                      <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center mb-6 text-slate-200">
                        <CheckSquare className="w-8 h-8" aria-hidden="true" />
                      </div>
                      <h4 className="text-xl font-bold text-emerald-950">
                        אין משימות כרגע!                  </h4>
                      <p className="text-slate-800 max-w-sm mx-auto text-sm mb-6 leading-relaxed">
                        העלו תמלול או צרו משימה כדי להתחיל
                      </p>

                      <button onClick={() => confirmNavigation(() => setActiveTab('upload'))} className="px-5 py-2.5 bg-[#047857] hover:bg-[#065f46] text-white! rounded-xl font-bold shadow-md transition-all duration-200 text-sm">
                        העלאת תמלול פגישה
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-dark-800/80 p-6 rounded-2xl border border-dark-600 flex items-center justify-between shadow-lg hover:border-dark-500 transition-all duration-300">
                          <div><span className="text-sm text-slate-200 font-medium">משימות פתוחות</span><h3 className="text-3xl font-extrabold text-white! mt-1">{openTasksCount}</h3></div>
                          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-primary-500 shadow-inner"><CheckSquare className="w-6 h-6" aria-hidden="true" /></div>
                        </div>
                        <div className="bg-dark-800/80 p-6 rounded-2xl border border-dark-600 flex items-center justify-between shadow-lg hover:border-dark-500 transition-all duration-300">
                          <div><span className="text-sm text-slate-200 font-medium">בעדיפות גבוהה</span><h3 className="text-3xl font-extrabold text-white! mt-1">{highPriorityCount}</h3></div>
                          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shadow-inner"><AlertCircle className="w-6 h-6 animate-pulse" aria-hidden="true" /></div>
                        </div>
                        <div className="bg-dark-800/80 p-6 rounded-2xl border border-dark-600 flex items-center justify-between shadow-lg hover:border-dark-500 transition-all duration-300">
                          <div><span className="text-sm text-slate-200 font-medium">עד סוף השבוע</span><h3 className="text-3xl font-extrabold text-white! mt-1">{dueThisWeekCount}</h3></div>
                          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-inner"><Clock className="w-6 h-6" aria-hidden="true" /></div>
                        </div>
                      </div>

                      {/* Charts */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-dark-800 border border-dark-600/50 p-6 rounded-3xl shadow-xl flex flex-col justify-between h-[340px] hover:border-dark-500 transition-all duration-300 relative overflow-visible">
                          <h4 className="text-base font-bold text-slate-100 mb-4">סטטוס משימות במערכת</h4>
                          <div className="flex items-center justify-around flex-1 relative overflow-visible">
                            <div className="flex flex-col gap-5 pr-2 text-right">
                              {[
                                { label: 'טרם התחיל', count: notStartedCount, color: 'bg-slate-400' },
                                { label: 'בביצוע', count: inProgressCount, color: 'bg-amber-500' },
                                { label: 'הושלם', count: completedCount, color: 'bg-primary-600' },
                              ].map(item => (
                                <div key={item.label} className="flex items-center gap-3">
                                  <span className={`w-4 h-4 rounded-full ${item.color} shrink-0`} aria-hidden="true" />
                                  <div className="flex flex-col text-right">
                                    <span className="text-sm font-bold text-slate-100">{item.label}: {item.count}</span>
                                    <span className="text-xs text-slate-200 font-semibold">{tasks.length ? ((item.count / tasks.length) * 100).toFixed(0) : 0}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="relative w-40 h-40">
                              <svg aria-hidden="true" className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="38" fill="none" stroke="var(--color-dark-600)" strokeWidth="8" />
                                {tasks.length > 0 && (<>
                                  <circle cx="50" cy="50" r="38" fill="none" stroke="#94A3B8" strokeWidth="8" strokeDasharray="238.76" strokeDashoffset={238.76 - (notStartedCount / tasks.length) * 238.76} className="transition-all duration-500" />
                                  <circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" strokeWidth="8" strokeDasharray="238.76" strokeDashoffset={238.76 - (inProgressCount / tasks.length) * 238.76} transform={`rotate(${(notStartedCount / tasks.length) * 360} 50 50)`} className="transition-all duration-500" />
                                  <circle cx="50" cy="50" r="38" fill="none" stroke="var(--color-primary-600)" strokeWidth="8" strokeDasharray="238.76" strokeDashoffset={238.76 - (completedCount / tasks.length) * 238.76} transform={`rotate(${((notStartedCount + inProgressCount) / tasks.length) * 360} 50 50)`} className="transition-all duration-500" />
                                </>)}
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                <span className="text-3xl font-extrabold text-white!">{tasks.length}</span>
                                <span className="text-xs text-slate-200 font-bold uppercase tracking-wider">סה"כ משימות</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-dark-800 border border-dark-600/50 p-6 rounded-3xl shadow-xl flex flex-col justify-between h-[340px] hover:border-dark-500 transition-all duration-300 relative overflow-visible">
                          <h4 className="text-base font-bold text-slate-100 mb-4">פרויקטים לפי תחומים</h4>
                          <div className="flex items-center justify-around flex-1 overflow-visible relative">
                            {totalProjects === 0 ? (
                              <div className="text-center text-slate-200 text-xs py-16">אין נתוני פרויקטים</div>
                            ) : (<>
                              <div className="flex flex-col gap-2.5 max-h-[180px] overflow-y-auto pr-4 pl-1 min-w-[140px] max-w-[180px] text-right">
                                {areaSlices.map(slice => (
                                  <div key={slice.id} className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} aria-hidden="true" />
                                    <div className="flex flex-col text-right truncate">
                                      <span className="text-xs font-bold text-slate-100 truncate">{slice.name}</span>
                                      <span className="text-xs text-slate-200 font-semibold">{slice.count} פרויקטים</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="relative w-40 h-40 shrink-0">
                                <svg aria-hidden="true" className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="38" fill="none" stroke="var(--color-dark-600)" strokeWidth="8" />
                                  {areaSlices.map(slice => (
                                    <circle key={slice.id} cx="50" cy="50" r="38" fill="none" stroke={slice.color} strokeWidth={hoveredAreaId === slice.id ? "10" : "8"} strokeDasharray="238.76" strokeDashoffset={238.76 - (slice.percent * 238.76)} transform={`rotate(${slice.accumulated * 360} 50 50)`} onMouseEnter={() => setHoveredAreaId(slice.id)} onMouseLeave={() => setHoveredAreaId(null)} className="transition-all duration-300 cursor-pointer" />
                                  ))}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                  <span className="text-3xl font-extrabold text-white!">{totalProjects}</span>
                                  <span className="text-xs text-slate-200 font-bold uppercase tracking-wider">סה"כ פרויקטים</span>
                                </div>
                              </div>
                              {hoveredAreaId && (() => {
                                const activeSlice = areaSlices.find(s => s.id === hoveredAreaId);
                                if (!activeSlice) return null;
                                return (
                                  <div className="absolute right-6 top-14 bottom-6 z-40 bg-white border border-dark-600 text-slate-900 p-4 rounded-2xl shadow-xl text-right w-[260px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 pointer-events-none" role="tooltip">
                                    <div className="font-bold border-b border-dark-600/30 pb-2 mb-2 text-xs flex items-center justify-between gap-3">
                                      <span style={{ color: activeSlice.color }}>{activeSlice.name}</span>
                                      <span className="bg-[#047857] text-white! text-xs px-2 py-0.5 rounded-full font-bold">{activeSlice.count} פרויקטים</span>
                                    </div>
                                    <div className="space-y-2">
                                      {activeSlice.projects.map(proj => {
                                        const taskCount = tasks.filter(t => t.project_id === proj.id).length;
                                        const projColor = getProjectColor(proj.id);
                                        return (
                                          <div key={proj.id} className="flex justify-between items-center gap-4 text-xs">
                                            <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: projColor }} aria-hidden="true" />
                                              {proj.name}
                                            </span>
                                            <span className="text-slate-800 font-bold">{taskCount} משימות</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </>)}
                          </div>
                        </div>
                      </div>

                      {/* Task Table */}
                      <div className="bg-dark-800 border border-dark-600/50 p-6 rounded-3xl shadow-xl mb-8 hover:border-dark-500 transition-all duration-300 relative overflow-visible">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                          <h4 className="text-base font-bold text-slate-100">רשימת משימות</h4>
                          {(colFilterTitle || colFilterProject || colFilterPriority || colFilterStatus || colFilterDueDate) && (
                            // FIX 2: rose-700 for contrast
                            <button onClick={() => { setColFilterTitle(''); setColFilterProject(''); setColFilterPriority(''); setColFilterStatus(''); setColFilterDueDate(''); }} className="text-xs text-rose-700 hover:text-rose-800 font-bold border border-rose-700/30 hover:border-rose-700/60 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 rounded-xl transition-all duration-200">
                              נקה מסננים
                            </button>
                          )}
                        </div>

                        <div className="overflow-visible relative">
                          {activeFilterPopover && (
                            <div className="fixed inset-0 z-40 bg-transparent cursor-default" onClick={closeFilterPopover} aria-hidden="true" />
                          )}
                          <table className="w-full text-right border-collapse text-xs table-fixed" aria-label="רשימת משימות">
                            <thead>
                              {/* FIX 1: table headers use slate-200 for contrast */}
                              <tr className="border-b border-dark-600/50 text-slate-200 font-bold">
                                {[
                                  { key: 'title', label: 'משימה', width: 'w-[35%]', pr: 'pr-2' },
                                  { key: 'project', label: 'פרויקט', width: 'w-[25%]', pr: '' },
                                  { key: 'priority', label: 'עדיפות', width: 'w-[15%]', pr: '' },
                                  { key: 'status', label: 'סטטוס', width: 'w-[13%]', pr: '' },
                                  { key: 'dueDate', label: 'תאריך יעד', width: 'w-[12%]', pr: '' },
                                ].map(col => (
                                  <th key={col.key} className={`pb-3 relative select-none z-50 ${col.width} ${col.pr}`} scope="col">
                                    <button
                                      type="button"
                                      className="flex items-center gap-1.5 justify-start cursor-pointer hover:text-[#1a6b3f] hover:bg-primary-500/10 transition-colors w-fit rounded-lg px-1.5 py-0.5"
                                      onClick={(e) => openFilterPopover(col.key, e.currentTarget)}
                                      aria-expanded={activeFilterPopover === col.key}
                                      aria-haspopup="listbox"
                                    >
                                      <span>{col.label}</span>
                                      <ChevronDown aria-hidden="true" className={`w-3.5 h-3.5 transition-transform duration-200 ${activeFilterPopover === col.key ? 'rotate-180 text-primary-500' : ''}`} />
                                    </button>

                                    {activeFilterPopover === col.key && (
                                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-dark-800 border border-dark-600/80 p-2.5 rounded-xl shadow-xl w-full text-right font-normal text-xs animate-in fade-in slide-in-from-top-1 duration-150" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`סינון לפי ${col.label}`}>
                                        <label htmlFor={`filter-${col.key}`} className="block text-xs text-slate-200 mb-1.5 font-bold">סנן לפי {col.label}:</label>
                                        {col.key === 'title' && <input id="filter-title" type="text" placeholder="הקלד שם משימה..." value={colFilterTitle} onChange={(e) => setColFilterTitle(e.target.value)} className="w-full bg-dark-900 border border-dark-600 rounded-xl px-2.5 py-1.5 text-xs text-white! focus:outline-none focus:border-primary-500 transition-colors placeholder-slate-500" autoFocus />}
                                        {col.key === 'project' && <select id="filter-project" value={colFilterProject} onChange={(e) => setColFilterProject(e.target.value)} className="w-full bg-dark-900 border border-dark-600 rounded-xl px-2 py-1.5 text-xs text-white! focus:outline-none focus:border-primary-500 cursor-pointer"><option value="">הכל</option>{allProjects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}{tasksForProjectDropdown.some(t => !t.project_id) && <option value="general">פרויקט כללי</option>}</select>}
                                        {col.key === 'priority' && <select id="filter-priority" value={colFilterPriority} onChange={(e) => setColFilterPriority(e.target.value)} className="w-full bg-dark-900 border border-dark-600 rounded-xl px-2 py-1.5 text-xs text-white! focus:outline-none focus:border-primary-500 cursor-pointer"><option value="">הכל</option>{tasksForPriorityDropdown.some(t => t.priority === 'גבוהה') && <option value="גבוהה">גבוהה</option>}{tasksForPriorityDropdown.some(t => t.priority === 'בינונית') && <option value="בינונית">בינונית</option>}{tasksForPriorityDropdown.some(t => t.priority === 'נמוכה') && <option value="נמוכה">נמוכה</option>}</select>}
                                        {col.key === 'status' && <select id="filter-status" value={colFilterStatus} onChange={(e) => setColFilterStatus(e.target.value)} className="w-full bg-dark-900 border border-dark-600 rounded-xl px-2 py-1.5 text-xs text-white! focus:outline-none focus:border-primary-500 cursor-pointer"><option value="">הכל</option>{tasksForStatusDropdown.some(t => t.status === 'טרם התחיל') && <option value="טרם התחיל">טרם התחיל</option>}{tasksForStatusDropdown.some(t => t.status === 'בביצוע') && <option value="בביצוע">בביצוע</option>}{tasksForStatusDropdown.some(t => t.status === 'הושלם') && <option value="הושלם">הושלם</option>}</select>}
                                        {col.key === 'dueDate' && <select id="filter-duedate" value={colFilterDueDate} onChange={(e) => setColFilterDueDate(e.target.value)} className="w-full bg-dark-900 border border-dark-600 rounded-xl px-2 py-1.5 text-xs text-white! focus:outline-none focus:border-primary-500 cursor-pointer"><option value="">הכל</option>{tasksForDueDateDropdown.some(t => t.due_date && t.due_date.split('T')[0] === new Date().toISOString().split('T')[0]) && <option value="today">היום</option>}{tasksForDueDateDropdown.some(t => { if (!t.due_date) return false; const today = new Date(); today.setHours(0, 0, 0, 0); const d = new Date(t.due_date); d.setHours(0, 0, 0, 0); const end = new Date(today); end.setDate(today.getDate() + 7); end.setHours(23, 59, 59, 999); return d >= today && d <= end; }) && <option value="week">השבוע</option>}{tasksForDueDateDropdown.some(t => { if (!t.due_date || t.status === 'הושלם') return false; const today = new Date(); today.setHours(0, 0, 0, 0); const d = new Date(t.due_date); d.setHours(0, 0, 0, 0); return d < today; }) && <option value="overdue">עבר זמנו</option>}{tasksForDueDateDropdown.some(t => !t.due_date) && <option value="no-date">ללא תאריך</option>}</select>}
                                      </div>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-600/20">
                              {filteredTasks.length === 0 ? (
                                <tr><td colSpan="5" className="py-8 text-center text-slate-200 font-semibold">לא נמצאו משימות מתאימות</td></tr>
                              ) : (
                                filteredTasks.map(task => (
                                  <tr key={task.id} onClick={() => { setSelectedTask(task); setIsTaskModalOpen(true); }} className="hover:bg-dark-700/30 transition-colors cursor-pointer group">
                                    <td className="py-3.5 pr-2 w-[35%]">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setIsTaskModalOpen(true); }}
                                        className="font-bold text-slate-100 group-hover:text-primary-500 transition-colors max-w-xs truncate text-right w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
                                        aria-label={`פתח פרטי משימה: ${task.title}`}
                                      >
                                        {task.title}
                                      </button>
                                    </td>
                                    <td className="py-3.5 text-slate-200 font-medium w-[25%]">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getProjectColor(task.project_id) }} aria-hidden="true" />
                                        <span>{getProjectName(task.project_id)}</span>
                                      </div>
                                    </td>
                                    <td className="py-3.5 w-[15%]">
                                      {/* FIX badge colors for contrast and add priority icons */}
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-xs ${task.priority === 'גבוהה' ? 'bg-rose-100 text-rose-800' : task.priority === 'בינונית' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                        {task.priority === 'גבוהה' && (
                                          <Triangle
                                            className="w-2.5 h-2.5 shrink-0 stroke-[2.5]"
                                            aria-hidden="true"
                                          />
                                        )}
                                        {task.priority === 'בינונית' && (
                                          <Circle
                                            className="w-2.5 h-2.5 shrink-0 stroke-[2.5]"
                                            aria-hidden="true"
                                          />
                                        )}
                                        {task.priority === 'נמוכה' && (
                                          <Triangle
                                            className="w-2.5 h-2.5 shrink-0 rotate-180 stroke-[2.5]"
                                            aria-hidden="true"
                                          />
                                        )}
                                        <span>עדיפות {task.priority}</span>
                                      </span>
                                    </td>
                                    <td className="py-3.5 w-[13%]">
                                      {/* FIX 3: status "בביצוע" uses amber color */}
                                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${task.status === 'הושלם' ? 'bg-emerald-100 text-emerald-800' : task.status === 'בביצוע' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800 font-bold'}`}>
                                        {task.status}
                                      </span>
                                    </td>
                                    <td className="py-3.5 text-slate-200 font-semibold text-xs">{formatDate(task.due_date) || '-'}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'upload' && (
                <div className="animate-in fade-in duration-300">
                  {pendingApprovalTranscript ? (
                    <ApprovalScreen
                      transcript={pendingApprovalTranscript}
                      hierarchy={hierarchy}
                      isExitConfirmOpen={showExitConfirm}
                      onSave={(createdTasks) => { fetchTasks(); const f = createdTasks.find(t => t.project_id); if (f) setSelectedProjectId(f.project_id); setPendingApprovalTranscript(null); setActiveTab('board'); }}
                      onCancel={() => confirmNavigation(() => setPendingApprovalTranscript(null))}
                    />
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center max-w-xl mx-auto mb-8">
                        <h3 className="text-xl font-bold text-slate-950 mb-2">
                          עיבוד תמלולים ב-AI
                        </h3>

                        <p className="text-emerald-900 text-sm font-medium leading-6">
                          העלו קובץ תמלול פגישה בפורמט טקסט, Word או PDF.
                        </p>

                        <p className="text-emerald-900 text-sm font-medium leading-6">
                          המערכת תחלץ משימות ותשייך אותן אוטומטית לפרויקטים שלך.
                        </p>
                      </div>
                      <UploadZone onUploadSuccess={handleUploadSuccess} />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'board' && (
                <div className="animate-in fade-in duration-300">
                  {selectedProjectId ? (
                    <KanbanBoard projectId={selectedProjectId} tasks={tasks} onRefresh={fetchTasks} />
                  ) : (
                    <div className="bg-dark-800 p-8 rounded-2xl border border-dark-600 text-center py-20 shadow-md">
                      <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-4 text-slate-200"><CheckSquare className="w-8 h-8" aria-hidden="true" /></div>
                      <h3 className="text-xl font-bold text-white! mb-2">לוח קנבן לניהול משימות</h3>
                      <p className="text-slate-200 max-w-md mx-auto text-sm">אנא בחר פרויקט מסרגל הצד כדי לצפות בלוח הקנבן.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'archive' && (
                <div className="animate-in fade-in duration-300">
                  <ArchiveView hierarchy={hierarchy} onNavigateToProject={(projId) => { if (projId) { setSelectedProjectId(projId); } else { for (const area of hierarchy) { if (area.projects && area.projects.length > 0) { setSelectedProjectId(area.projects[0].id); break; } } } setActiveTab('board'); }} />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <CreateHierarchyModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} type={createType} parentId={createParentId} hierarchy={hierarchy} onSuccess={handleCreateSuccess} />
      <DeleteConfirmModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} targetType={deleteType} targetId={deleteId} targetName={deleteName} onSuccess={handleDeleteSuccess} />
      <TaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} task={selectedTask} projectId={selectedTask ? selectedTask.project_id : selectedProjectId} onSuccess={fetchTasks} />

      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-955/80 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-confirm-title"
          aria-describedby="exit-confirm-desc"
        >
          <div className="relative w-full max-w-md bg-white border border-dark-600 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-800 mb-4" aria-hidden="true">
              <AlertCircle className="w-6 h-6 text-rose-800" aria-hidden="true" />
            </div>

            <h3 id="exit-confirm-title" className="text-lg font-bold text-center text-emerald-950 mb-2">
              אישור יציאה ללא שמירה
            </h3>

            <p id="exit-confirm-desc" className="text-sm text-slate-800 text-center leading-relaxed mb-6 font-medium">
              האם אתם בטוחים שברצונכם לצאת? כל השינויים במשימות ה-AI שלא נשמרו יאבדו לצמיתות.
            </p>

            <div className="flex justify-center gap-3 pt-4 border-t border-dark-600/70">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  setExitAction(null);
                }}
                className="px-5 py-2 text-sm text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800"
              >
                המשך עבודה
              </button>
              <button
                type="button"
                onClick={() => {
                  if (exitAction) exitAction();
                  setShowExitConfirm(false);
                  setExitAction(null);
                }}
                className="flex items-center justify-center gap-2 px-6 py-2 text-sm font-bold bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white! rounded-xl shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-800"
              >
                יציאה ללא שמירה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;