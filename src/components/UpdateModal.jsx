import React from 'react';

function UpdateModal({ currentVersion, latestVersion, onUpdate, onExit }) {
  return (
    <div className="update-modal-overlay">
      <div className="update-modal">
        <div className="update-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>

        <h2 className="gradient-text">UPDATE</h2>

        <p className="update-version">
          <span>v{latestVersion}</span> is available (current: v{currentVersion})
        </p>

        <p>
          A new version of OBZVON is available. Please update to continue using the application.
        </p>

        <div className="update-buttons">
          <button className="update-btn" onClick={onExit}>
            EXIT
          </button>
          <button className="update-btn primary" onClick={onUpdate}>
            UPDATE
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateModal;
