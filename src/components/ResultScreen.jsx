import React from 'react';
import AnimatedBackground from './AnimatedBackground';

function ResultScreen({ stats, savedStats, onRestart, onBack }) {
  const accuracy = stats.hits + stats.misses > 0
    ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
    : 0;

  const isNewHighScore = stats.score >= savedStats.highScore && stats.score > 0;

  return (
    <div className="result-screen fade-in">
      <AnimatedBackground />
      <div className="result-content">
        {isNewHighScore && (
          <div className="new-highscore">NEW HIGH SCORE!</div>
        )}

        <h1 className="result-title gradient-text">GAME OVER</h1>

        <div className="result-score">
          <span className="result-score-value">{stats.score}</span>
          <span className="result-score-label">FINAL SCORE</span>
        </div>

        <div className="result-stats">
          <div className="result-stat">
            <span className="result-stat-value hits">{stats.hits}</span>
            <span className="result-stat-label">HITS</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-value misses">{stats.misses}</span>
            <span className="result-stat-label">MISSES</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-value">{accuracy}%</span>
            <span className="result-stat-label">ACCURACY</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-value combo">{stats.maxCombo}x</span>
            <span className="result-stat-label">MAX COMBO</span>
          </div>
        </div>

        <div className="result-buttons">
          <button className="result-btn primary" onClick={onRestart}>
            PLAY AGAIN
          </button>
          <button className="result-btn secondary" onClick={onBack}>
            MAIN MENU
          </button>
        </div>

        <p className="result-hint">Press SPACE or ENTER to continue</p>
      </div>
    </div>
  );
}

export default ResultScreen;
