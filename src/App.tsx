import React, { useState, useEffect, useCallback } from 'react';
import TitleBar from './components/TitleBar';
import StartScreen from './components/StartScreen';
import GameCanvas from './components/GameCanvas';
import ResultScreen from './components/ResultScreen';
import SettingsModal from './components/SettingsModal';
import UpdateModal from './components/UpdateModal';
import type { GameState, Difficulty, DifficultySettings, GameStats, SavedStats, UpdateInfo } from './types';

const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  EASY: { targetSize: 85, spawnInterval: 650, lifetime: 1400 },
  MEDIUM: { targetSize: 70, spawnInterval: 480, lifetime: 1100 },
  HARD: { targetSize: 55, spawnInterval: 350, lifetime: 800 }
};

const GAME_DURATION = 30000;

function App(): React.ReactElement {
  const [gameState, setGameState] = useState<GameState>('start');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    hits: 0,
    misses: 0,
    combo: 0,
    maxCombo: 0
  });
  const [savedStats, setSavedStats] = useState<SavedStats>({
    highScore: 0,
    totalHits: 0,
    totalMisses: 0,
    gamesPlayed: 0
  });
  const [gradientSpeed] = useState(1);

  useEffect(() => {
    document.documentElement.style.setProperty('--gradient-speed', `${gradientSpeed}s`);
  }, [gradientSpeed]);

  useEffect(() => {
    const checkUpdates = async (): Promise<void> => {
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

  useEffect(() => {
    const loadStats = async (): Promise<void> => {
      if (window.electronAPI) {
        const loaded = await window.electronAPI.getStats();
        setSavedStats(loaded);
      }
    };
    loadStats();
  }, []);

  const startGame = useCallback((): void => {
    if (updateRequired) return;
    setStats({ score: 0, hits: 0, misses: 0, combo: 0, maxCombo: 0 });
    setGameState('playing');
  }, [updateRequired]);

  const endGame = useCallback(async (): Promise<void> => {
    setGameState('result');

    if (window.electronAPI) {
      const isNewHigh = await window.electronAPI.updateHighScore(stats.score);

      const newSavedStats: SavedStats = {
        highScore: isNewHigh ? stats.score : savedStats.highScore,
        totalHits: savedStats.totalHits + stats.hits,
        totalMisses: savedStats.totalMisses + stats.misses,
        gamesPlayed: savedStats.gamesPlayed + 1
      };

      await window.electronAPI.saveStats(newSavedStats);
      setSavedStats(newSavedStats);
    }
  }, [stats, savedStats]);

  const backToStart = useCallback((): void => {
    setGameState('start');
    setStats({ score: 0, hits: 0, misses: 0, combo: 0, maxCombo: 0 });
  }, []);

  const updateStats = useCallback((newStats: Partial<GameStats>): void => {
    setStats(prev => ({ ...prev, ...newStats }));
  }, []);

  const openSettings = useCallback((): void => {
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback((): void => {
    setSettingsOpen(false);
  }, []);

  const handleUpdate = useCallback((): void => {
    window.electronAPI?.downloadUpdate();
  }, []);

  const handleExit = useCallback((): void => {
    window.electronAPI?.quitApp();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
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
  }, [gameState, settingsOpen, updateRequired, startGame, endGame, backToStart]);

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

      <SettingsModal isOpen={settingsOpen} onClose={closeSettings} />

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
