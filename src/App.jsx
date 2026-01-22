import React, { useState, useEffect, useCallback } from 'react';
import TitleBar from './components/TitleBar';
import StartScreen from './components/StartScreen';
import GameCanvas from './components/GameCanvas';
import ResultScreen from './components/ResultScreen';
import SettingsModal from './components/SettingsModal';
import UpdateModal from './components/UpdateModal';

const DIFFICULTY_SETTINGS = {
  EASY: { targetSize: 85, spawnInterval: 650, lifetime: 1400 },
  MEDIUM: { targetSize: 70, spawnInterval: 480, lifetime: 1100 },
  HARD: { targetSize: 55, spawnInterval: 350, lifetime: 800 }
};

const GAME_DURATION = 30000; // 30 seconds

function App() {
  const [gameState, setGameState] = useState('start'); // start, playing, paused, result
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [stats, setStats] = useState({
    score: 0,
    hits: 0,
    misses: 0,
    combo: 0,
    maxCombo: 0
  });
  const [savedStats, setSavedStats] = useState({
    highScore: 0,
    totalHits: 0,
    totalMisses: 0,
    gamesPlayed: 0
  });
  const [gradientSpeed, setGradientSpeed] = useState(2); // seconds (FAST)

  // Apply gradient speed to CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--gradient-speed', `${gradientSpeed}s`);
  }, [gradientSpeed]);

  // Check for updates on mount
  useEffect(() => {
    const checkUpdates = async () => {
      if (window.electronAPI?.checkForUpdates) {
        const info = await window.electronAPI.checkForUpdates();
        setUpdateInfo(info);
        if (info.needsUpdate) {
          setUpdateRequired(true);
        }
      }
    };
    checkUpdates();
  }, []);

  // Load saved stats on mount
  useEffect(() => {
    const loadStats = async () => {
      if (window.electronAPI) {
        const loaded = await window.electronAPI.getStats();
        setSavedStats(loaded);
      }
    };
    loadStats();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Block keyboard shortcuts if update is required
      if (updateRequired) return;

      if (e.key === 'F11') {
        e.preventDefault();
        window.electronAPI?.fullscreen();
      }

      if (gameState === 'start' && !settingsOpen && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        startGame();
      }

      if (gameState === 'playing' && e.key === 'Escape') {
        endGame();
      }

      if (gameState === 'playing' && e.key.toLowerCase() === 'p') {
        setGameState('paused');
      }

      if (gameState === 'paused' && (e.key.toLowerCase() === 'p' || e.key === ' ')) {
        setGameState('playing');
      }

      if (gameState === 'result' && (e.key === ' ' || e.key === 'Enter')) {
        backToStart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, settingsOpen, updateRequired]);

  const startGame = useCallback(() => {
    if (updateRequired) return;
    setStats({ score: 0, hits: 0, misses: 0, combo: 0, maxCombo: 0 });
    setGameState('playing');
  }, [updateRequired]);

  const endGame = useCallback(async () => {
    setGameState('result');

    if (window.electronAPI) {
      // Update high score
      const isNewHigh = await window.electronAPI.updateHighScore(stats.score);

      // Update cumulative stats
      const newSavedStats = {
        highScore: isNewHigh ? stats.score : savedStats.highScore,
        totalHits: savedStats.totalHits + stats.hits,
        totalMisses: savedStats.totalMisses + stats.misses,
        gamesPlayed: savedStats.gamesPlayed + 1
      };

      await window.electronAPI.saveStats(newSavedStats);
      setSavedStats(newSavedStats);
    }
  }, [stats, savedStats]);

  const backToStart = useCallback(() => {
    setGameState('start');
    setStats({ score: 0, hits: 0, misses: 0, combo: 0, maxCombo: 0 });
  }, []);

  const updateStats = useCallback((newStats) => {
    setStats(prev => ({ ...prev, ...newStats }));
  }, []);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleUpdate = useCallback(() => {
    window.electronAPI?.downloadUpdate();
  }, []);

  const handleExit = useCallback(() => {
    window.electronAPI?.quitApp();
  }, []);

  return (
    <div className="app">
      <TitleBar />
      <div className="app-content">
        {gameState === 'start' && (
          <StartScreen
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            onStart={startGame}
            savedStats={savedStats}
            onOpenSettings={openSettings}
          />
        )}

        {(gameState === 'playing' || gameState === 'paused') && (
          <GameCanvas
            settings={DIFFICULTY_SETTINGS[difficulty]}
            duration={GAME_DURATION}
            stats={stats}
            updateStats={updateStats}
            isPaused={gameState === 'paused'}
            onGameEnd={endGame}
          />
        )}

        {gameState === 'result' && (
          <ResultScreen
            stats={stats}
            savedStats={savedStats}
            onRestart={startGame}
            onBack={backToStart}
          />
        )}
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={closeSettings}
        gradientSpeed={gradientSpeed}
        setGradientSpeed={setGradientSpeed}
      />

      {updateRequired && updateInfo && (
        <UpdateModal
          currentVersion={updateInfo.currentVersion}
          latestVersion={updateInfo.latestVersion}
          onUpdate={handleUpdate}
          onExit={handleExit}
        />
      )}
    </div>
  );
}

export default App;
