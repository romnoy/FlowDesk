import React, { useState, useRef, useId } from 'react';
import { Upload, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export default function UploadZone({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const componentId = useId();
  const instructionsId = `${componentId}-upload-instructions`;
  const loadingId = `${componentId}-loading-status`;
  const errorMessageId = `${componentId}-error-message`;
  const successMessageId = `${componentId}-success-message`;

  const allowedExtensions = ['.txt', '.docx', '.pdf'];

  const validateFile = (file) => {
    if (!file) return false;

    const fileName = file.name;
    const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      setError('פורמט הקובץ אינו נתמך, נא להעלות .txt, .docx או .pdf');
      setSuccess(null);
      return false;
    }

    setError(null);
    return true;
  };

  const triggerFileSelect = () => {
    if (!isLoading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();

    if (!isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();

    if (!isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();

    /*
      מונע כיבוי של מצב drag כשעוברים בין אלמנטים פנימיים
      בתוך אזור ההעלאה.
    */
    if (e.currentTarget.contains(e.relatedTarget)) {
      return;
    }

    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();

    if (isLoading) return;

    setIsDragging(false);
    setError(null);
    setSuccess(null);

    const droppedFiles = e.dataTransfer.files;

    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];

      if (validateFile(file)) {
        uploadFile(file);
      }
    }
  };

  const handleFileChange = (e) => {
    setError(null);
    setSuccess(null);

    const selectedFiles = e.target.files;

    if (selectedFiles.length > 0) {
      const file = selectedFiles[0];

      if (validateFile(file)) {
        uploadFile(file);
      }
    }

    /*
      מאפשר לבחור שוב את אותו קובץ אחרי שגיאה/הצלחה,
      כי אחרת onChange לא תמיד יופעל.
    */
    e.target.value = '';
  };

  const handleKeyDown = (e) => {
    if (isLoading) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerFileSelect();
    }
  };

  const pollTranscriptStatus = (id, fileName) => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:3001/api/transcripts/${id}`);

          if (!res.ok) {
            clearInterval(interval);

            const errData = await res.json().catch(() => ({}));
            reject(new Error(errData.error || 'שגיאה בבדיקת סטטוס התמלול'));
            return;
          }

          const transcript = await res.json();

          if (transcript.status === 'completed') {
            clearInterval(interval);

            setSuccess(`הקובץ "${fileName}" נטען ועובד בהצלחה!`);

            if (onUploadSuccess) {
              onUploadSuccess(transcript);
            }

            resolve(transcript);
          } else if (transcript.status === 'failed') {
            clearInterval(interval);
            reject(new Error('עיבוד התמלול נכשל. נא לנסות שוב.'));
          }
        } catch (err) {
          clearInterval(interval);
          reject(err);
        }
      }, 1000);
    });
  };

  const uploadFile = async (file) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/api/transcripts', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'אירעה שגיאה בהעלאת הקובץ');
      }

      const transcriptId = data.id;

      if (!transcriptId) {
        throw new Error('לא התקבל מזהה תמלול מהשרת');
      }

      await pollTranscriptStatus(transcriptId, file.name);
    } catch (err) {
      console.error('Upload/Polling error:', err);
      setError(err.message || 'חיבור לשרת נכשל. אנא ודא שהשרת פועל.');
    } finally {
      setIsLoading(false);
    }
  };

  const describedByIds = [
    instructionsId,
    isLoading ? loadingId : null,
    error ? errorMessageId : null,
    success ? successMessageId : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="w-full max-w-2xl mx-auto p-4" dir="rtl">
      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 p-4 bg-rose-50 border border-rose-400 rounded-2xl flex items-start gap-3 text-rose-800 animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <AlertCircle
            className="w-5 h-5 shrink-0 mt-0.5 text-rose-800"
            aria-hidden="true"
          />

          <div>
            <h5 className="font-bold text-sm text-rose-900">
              שגיאת עיבוד קובץ
            </h5>

            <p
              id={errorMessageId}
              className="text-xs text-rose-800 mt-1"
            >
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 p-4 bg-emerald-50 border border-emerald-500 rounded-2xl flex items-start gap-3 text-emerald-800 animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <CheckCircle2
            className="w-5 h-5 shrink-0 mt-0.5 text-emerald-800"
            aria-hidden="true"
          />

          <div>
            <h5 className="font-bold text-sm text-emerald-900">
              העלאה הושלמה
            </h5>

            <p
              id={successMessageId}
              className="text-xs text-emerald-800 mt-1"
            >
              {success}
            </p>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".txt,.docx,.pdf"
        className="sr-only"
        disabled={isLoading}
        aria-label="בחירת קובץ תמלול להעלאה"
      />

      {/* Drop Zone Box */}
      <div
        role="button"
        tabIndex={isLoading ? -1 : 0}
        aria-label={
          isLoading
            ? 'הקובץ נמצא בעיבוד. נא להמתין לסיום הפעולה'
            : 'העלאת קובץ תמלול. לחצו לבחירת קובץ או גררו קובץ לאזור זה'
        }
        aria-describedby={describedByIds}
        aria-disabled={isLoading}
        aria-busy={isLoading}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isLoading ? triggerFileSelect : undefined}
        className={`relative overflow-hidden group border rounded-3xl p-12 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[300px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-emerald-800 ${isLoading
          ? 'border-emerald-700 bg-white/70 cursor-not-allowed'
          : isDragging
            ? 'border-emerald-800 bg-emerald-50 shadow-[0_0_30px_-5px_rgba(4,120,87,0.18)] cursor-pointer'
            : 'border-slate-100 bg-white hover:border-emerald-800 hover:bg-emerald-50 cursor-pointer shadow-sm'
          }`}
      >
        {isLoading ? (
          <div
            id={loadingId}
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="flex flex-col items-center justify-center gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Loader2
                className="w-8 h-8 animate-spin"
                aria-hidden="true"
              />
            </div>

            <h4 className="text-lg font-bold text-slate-900">
              מעבד את הקובץ... נא לא לסגור את העמוד
            </h4>

            <p className="text-sm text-slate-700">
              התמלול נשלח לעיבוד. התהליך עשוי להימשך מספר רגעים.
            </p>
          </div>
        ) : (
          <>
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${isDragging
                ? 'bg-emerald-100 text-emerald-800 scale-110'
                : 'bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200 group-hover:text-emerald-900'
                }`}
              aria-hidden="true"
            >
              <Upload className="w-8 h-8" aria-hidden="true" />
            </div>

            <h4 className="text-lg font-bold text-slate-950 mb-2">
              העלו את קובץ התמלול כאן
            </h4>

            <p
              id={instructionsId}
              className="text-sm text-slate-700 mb-6 max-w-sm"
            >
              או לחצו כדי לבחור קובץ מתיקייה במחשב.
              <br />
              סוגי קבצים נתמכים:{' '}
              <bdi
                dir="ltr"
                className="inline-block whitespace-nowrap font-bold text-emerald-800"
              >
                .txt, .docx, .pdf
              </bdi>
            </p>

            <div className="flex items-center gap-6 text-xs text-slate-700 border-t border-emerald-700/40 pt-4 w-full justify-center">
              <div>
                התמלול יעובד על ידי בינה מלאכותית
              </div>
            </div>
          </>
        )}

        {/* Ambient lighting glow for drag hover */}
        {isDragging && !isLoading && (
          <div
            className="absolute inset-0 bg-radial-gradient from-emerald-500/5 via-transparent to-transparent pointer-events-none"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}