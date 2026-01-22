import React from 'react';

function HUD({ score, accuracy, combo, timeLeft, duration }) {
  const timeSeconds = Math.ceil(timeLeft / 1000);
  const timeProgress = (timeLeft / duration) * 100;

  return (
    <div className="hud">
      <div className="hud-left">
        <div className="hud-item score">
          <span className="hud-value">{score}</span>
          <span className="hud-label">SCORE</span>
        </div>
      </div>

      <div className="hud-center">
        <div className="timer">
          <div className="timer-bar">
            <div
              className="timer-progress"
              style={{ width: `${timeProgress}%` }}
            />
          </div>
          <span className="timer-text">{timeSeconds}s</span>
        </div>
      </div>

      <div className="hud-right">
        <div className="hud-item accuracy">
          <span className="hud-value">{accuracy}%</span>
          <span className="hud-label">ACCURACY</span>
        </div>
        <div className={`hud-item combo ${combo > 0 ? 'active' : ''}`}>
          <span className="hud-value">{combo}x</span>
          <span className="hud-label">COMBO</span>
        </div>
      </div>
    </div>
  );
}

export default HUD;
