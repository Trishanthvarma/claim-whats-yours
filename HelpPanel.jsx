// Help button. Opens a side panel with numbered steps and a "Read aloud" button.
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { speak } from '../lib/voice.js';

export function HelpButton({ steps = [] }) {
  const [open, setOpen] = useState(false);
  const { lang } = useLanguage();
  const closeRef = useRef(null);

  // Close on Escape, and move focus into the panel when it opens.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function readAloud() {
    // Read every step in the chosen language. speak() looks up the browser code itself,
    // so pass the plain key ('en', 'te' or 'hi'), not 'te-IN'.
    speak(steps.join('. '), lang);
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Help
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-panel-title"
            style={{ marginLeft: 'auto', maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 id="help-panel-title">Help</h2>
              <button ref={closeRef} type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            {steps.length === 0 ? (
              <p>No help is available for this page.</p>
            ) : (
              <ol>
                {steps.map((step, index) => (
                  <li key={index} style={{ marginBottom: 8 }}>
                    {step}
                  </li>
                ))}
              </ol>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={readAloud} disabled={steps.length === 0}>
                Read aloud
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
