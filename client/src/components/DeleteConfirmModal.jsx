import React, { useState, useEffect, useId } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  onSuccess
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();

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

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    const url = targetType === 'area'
      ? `http://localhost:3001/api/hierarchy/areas/${targetId}`
      : `http://localhost:3001/api/hierarchy/projects/${targetId}`;

    try {
      const response = await fetch(url, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'אירעה שגיאה במחיקת הפריט');
      }

      onSuccess({ targetType, targetId });
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'אירעה שגיאה במחיקת הפריט');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
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
          id={titleId}
          className="text-lg font-bold text-center text-emerald-950 mb-2"
        >
          אישור מחיקה לצמיתות
        </h3>

        <p
          id={descriptionId}
          className="text-sm text-slate-800 text-center leading-relaxed mb-6 font-medium"
        >
          למחוק את {targetType === 'area' ? 'הקטגוריה' : 'הפרויקט'}{' '}
          <strong className="text-emerald-950 font-bold">
            "{targetName}"
          </strong>
          ?
        </p>

        {error && (
          <div
            id={errorId}
            className="mb-4 p-3 bg-rose-50 border border-rose-700 text-rose-800 rounded-2xl text-xs font-semibold"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex justify-center gap-3 pt-4 border-t border-dark-600/70">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            ביטול
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 px-6 py-2 text-sm font-bold bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white! rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-wait"
            disabled={isLoading}
            aria-describedby={error ? errorId : undefined}
          >
            {isLoading && (
              <Loader2
                className="w-4 h-4 animate-spin text-white!"
                aria-hidden="true"
              />
            )}

            <span className="text-white!">
              מחיקה לצמיתות
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}