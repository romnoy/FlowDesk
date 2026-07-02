import React, { useState, useEffect, useId } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function EditHierarchyModal({
  isOpen,
  onClose,
  type,
  id,
  initialName,
  onSuccess
}) {
  const [name, setName] = useState(initialName || '');
  const [error, setError] = useState(null);
  const [errorField, setErrorField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const componentId = useId();
  const titleId = `${componentId}-title`;
  const nameInputId = `${componentId}-name`;
  const errorId = `${componentId}-error`;
  const nameHelpId = `${componentId}-name-help`;

  const isArea = type === 'area';

  useEffect(() => {
    if (isOpen) {
      setName(initialName || '');
      setError(null);
      setErrorField(null);
      setIsLoading(false);
    }
  }, [isOpen, initialName]);

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

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('שם הוא שדה חובה');
      setErrorField('name');
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorField(null);

    let url = '';
    if (isArea) {
      url = `http://localhost:3001/api/hierarchy/areas/${id}`;
    } else {
      url = `http://localhost:3001/api/hierarchy/projects/${id}`;
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'אירעה שגיאה בשמירת הנתונים');
      }

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message || 'אירעה שגיאה בשמירת הנתונים');
      setErrorField(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameChange = (e) => {
    setName(e.target.value);

    if (errorField === 'name') {
      setError(null);
      setErrorField(null);
    }
  };

  const nameDescribedBy = [
    nameHelpId,
    error && errorField === 'name' ? errorId : null
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="relative w-full max-w-md bg-white border border-dark-600 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3
            id={titleId}
            className="text-lg font-bold text-emerald-950"
          >
            {isArea ? 'עריכת שם קטגוריה' : 'עריכת שם פרויקט'}
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
              htmlFor={nameInputId}
              className="text-xs font-semibold text-slate-800"
            >
              שם{' '}
              <span className="text-rose-700" aria-hidden="true">
                *
              </span>
              <span className="sr-only">שדה חובה</span>
            </label>

            <p id={nameHelpId} className="sr-only">
              יש להזין שם עבור {isArea ? 'הקטגוריה' : 'הפרויקט'}.
            </p>

            <input
              id={nameInputId}
              type="text"
              placeholder="הזינו שם..."
              value={name}
              onChange={handleNameChange}
              className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-700 focus:outline-none focus:border-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-wait ${errorField === 'name'
                  ? 'border-rose-700'
                  : 'border-dark-600'
                }`}
              disabled={isLoading}
              autoFocus
              aria-required="true"
              aria-invalid={errorField === 'name'}
              aria-describedby={nameDescribedBy}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-600/70 mt-6">
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
              <span className="text-white!">שמירה</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
