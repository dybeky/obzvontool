import React, { useState, useEffect } from 'react';

function TitleBar(): React.ReactElement {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async (): Promise<void> => {
      if (window.electronAPI) {
        const maximized = await window.electronAPI.isMaximized();
        setIsMaximized(maximized);
      }
    };

    checkMaximized();
    window.addEventListener('resize', checkMaximized);
    return () => window.removeEventListener('resize', checkMaximized);
  }, []);

  const handleMinimize = (): void => window.electronAPI?.minimize();
  const handleMaximize = async (): Promise<void> => {
    window.electronAPI?.maximize();
    const maximized = await window.electronAPI?.isMaximized();
    setIsMaximized(maximized ?? false);
  };
  const handleClose = (): void => window.electronAPI?.close();

  return (
    <div className="title-bar">
      <div className="title-bar-left">
        <span className="title-bar-title gradient-text">OBZVON.</span>
        <span className="title-bar-version">v1.0.0</span>
      </div>

      <div className="title-bar-drag"></div>

      <div className="title-bar-controls">
        <button className="title-btn minimize" onClick={handleMinimize}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect y="5" width="12" height="2" fill="currentColor" />
          </svg>
        </button>
        <button className="title-btn maximize" onClick={handleMaximize}>
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <rect x="0" y="4" width="8" height="8" fill="var(--bg-primary)" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          )}
        </button>
        <button className="title-btn close" onClick={handleClose}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
