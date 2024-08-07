import React, { useState, useEffect } from 'react';

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div>
      <button
        className="help-button"
        onClick={() => setIsOpen(true)}
        aria-label="Open help"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="ml-2">Help</span>
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">How to use ACStorage</h2>
            <div className="modal-body">
              <p className="text-lg mb-4">Follow these steps to store and manage your files securely:</p>
              <ol className="steps-list">
                <li>Enter your Discord bot token, channel ID, and encryption key in the provided fields.</li>
                <li>Click &quot;Set Credentials&quot; to save your information.</li>
                <li>Use the file uploader to select and upload files.</li>
                <li>View your uploaded files in the file list below.</li>
                <li>Download files by clicking the download button next to each file.</li>
                <li>Generate share codes for files you want to share with others.</li>
                <li>Use the &quot;Download from Share Code&quot; feature to download shared files.</li>
              </ol>
              <div className="info-box primary">
                <h3>Quick Access</h3>
                <a href="https://discord-storage-beryl.vercel.app/" target="_blank" rel="noopener noreferrer" className="link">
                  https://discord-storage-beryl.vercel.app/
                </a>
                <p>Use ACStorage directly without any setup.</p>
              </div>
              <div className="info-box warning">
                <h3>Security Note</h3>
                <p>Keep your Discord bot token and encryption key secure. They are used locally and never sent to any server.</p>
              </div>
            </div>
            <button className="close-button" onClick={() => setIsOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .help-button {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          background-color: var(--color-primary);
          color: var(--color-primary-foreground);
          border: none;
          border-radius: 9999px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .help-button:hover {
          background-color: var(--color-primary-dark);
          box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(5px);
        }

        .modal-content {
          background-color: var(--color-background);
          color: var(--color-text);
          border-radius: 1rem;
          padding: 2rem;
          max-width: min(90vw, 40rem);
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .modal-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: var(--color-primary);
        }

        .modal-body {
          font-size: 1rem;
          line-height: 1.6;
        }

        .steps-list {
          list-style-type: none;
          counter-reset: step;
          padding-left: 0;
        }

        .steps-list li {
          counter-increment: step;
          margin-bottom: 1rem;
          padding-left: 3rem;
          position: relative;
        }

        .steps-list li::before {
          content: counter(step);
          background-color: var(--color-primary);
          color: var(--color-primary-foreground);
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          position: absolute;
          left: 0;
          top: 0;
        }

        .info-box {
          border-radius: 0.5rem;
          padding: 1rem;
          margin-top: 1.5rem;
        }

        .info-box.primary {
          background-color: var(--color-primary-light);
          border: 1px solid var(--color-primary);
        }

        .info-box.warning {
          background-color: var(--color-warning-light);
          border: 1px solid var(--color-warning);
        }

        .info-box h3 {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .link {
          color: var(--color-primary);
          text-decoration: none;
          border-bottom: 1px solid var(--color-primary);
          transition: border-bottom-color 0.3s ease;
        }

        .link:hover {
          border-bottom-color: transparent;
        }

        .close-button {
          margin-top: 1.5rem;
          padding: 0.5rem 1rem;
          background-color: var(--color-primary);
          color: var(--color-primary-foreground);
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          transition: background-color 0.3s ease;
        }

        .close-button:hover {
          background-color: var(--color-primary-dark);
        }

        @media (max-width: 640px) {
          .modal-content {
            padding: 1.5rem;
          }

          .modal-title {
            font-size: 1.5rem;
          }

          .steps-list li {
            padding-left: 2.5rem;
          }

          .steps-list li::before {
            width: 1.5rem;
            height: 1.5rem;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}