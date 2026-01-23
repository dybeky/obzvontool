import React, { useState, useEffect, useRef, useCallback } from 'react';
import HUD from './HUD';
import Target from './Target';
import type { Target as TargetType, Effect, GameStats, DifficultySettings } from '../types';

interface GameCanvasProps {
  settings: DifficultySettings;
  duration: number;
  stats: GameStats;
  updateStats: (stats: Partial<GameStats>) => void;
  isPaused: boolean;
  onGameEnd: () => void;
}

function GameCanvas({ settings, duration, stats, updateStats, isPaused, onGameEnd }: GameCanvasProps): React.ReactElement {
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [timeLeft, setTimeLeft] = useState(duration);
  const canvasRef = useRef<HTMLDivElement>(null);
  const spawnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetIdRef = useRef(0);

  const calculateScore = (reactionTime: number): number => {
    if (reactionTime < 200) return 50;
    if (reactionTime < 400) return 35;
    if (reactionTime < 700) return 22;
    return 12;
  };

  const addEffect = useCallback((x: number, y: number, type: 'hit' | 'miss', score = 0): void => {
    const effectId = Date.now() + Math.random();
    setEffects(prev => [...prev, { id: effectId, x, y, type, score }]);

    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== effectId));
    }, 500);
  }, []);

  const spawnTarget = useCallback((): void => {
    if (isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const padding = settings.targetSize;
    const x = padding + Math.random() * (rect.width - padding * 2);
    const y = padding + Math.random() * (rect.height - padding * 2);

    const newTarget: TargetType = {
      id: targetIdRef.current++,
      x,
      y,
      size: settings.targetSize,
      spawnTime: Date.now(),
      lifetime: settings.lifetime
    };

    setTargets(prev => [...prev, newTarget]);

    setTimeout(() => {
      setTargets(prev => {
        const target = prev.find(t => t.id === newTarget.id);
        if (target) {
          updateStats({
            misses: stats.misses + 1,
            combo: 0
          });
          addEffect(target.x, target.y, 'miss');
          return prev.filter(t => t.id !== newTarget.id);
        }
        return prev;
      });
    }, settings.lifetime);
  }, [settings, isPaused, stats.misses, updateStats, addEffect]);

  const handleTargetClick = useCallback((target: TargetType, e: React.MouseEvent): void => {
    e.stopPropagation();

    const reactionTime = Date.now() - target.spawnTime;
    const baseScore = calculateScore(reactionTime);
    const newCombo = stats.combo + 1;
    const comboMultiplier = 1 + (newCombo - 1) * 0.1;
    const finalScore = Math.round(baseScore * comboMultiplier);

    setTargets(prev => prev.filter(t => t.id !== target.id));

    updateStats({
      score: stats.score + finalScore,
      hits: stats.hits + 1,
      combo: newCombo,
      maxCombo: Math.max(stats.maxCombo, newCombo)
    });

    addEffect(target.x, target.y, 'hit', finalScore);
  }, [stats, updateStats, addEffect]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>): void => {
    if (isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateStats({
      misses: stats.misses + 1,
      combo: 0
    });

    addEffect(x, y, 'miss');
  }, [isPaused, stats.misses, updateStats, addEffect]);

  useEffect(() => {
    if (!isPaused) {
      spawnIntervalRef.current = setInterval(spawnTarget, settings.spawnInterval);
      spawnTarget();
    }

    return () => {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
      }
    };
  }, [isPaused, settings.spawnInterval, spawnTarget]);

  useEffect(() => {
    if (!isPaused) {
      gameTimerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 100) {
            onGameEnd();
            return 0;
          }
          return prev - 100;
        });
      }, 100);
    }

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    };
  }, [isPaused, onGameEnd]);

  const accuracy = stats.hits + stats.misses > 0
    ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
    : 100;

  return (
    <div className="game-container">
      <HUD
        score={stats.score}
        accuracy={accuracy}
        combo={stats.combo}
        timeLeft={timeLeft}
        duration={duration}
      />

      <div
        ref={canvasRef}
        className="game-canvas"
        onClick={handleCanvasClick}
      >
        {targets.map(target => (
          <Target
            key={target.id}
            target={target}
            onClick={(e) => handleTargetClick(target, e)}
          />
        ))}

        {effects.map(effect => (
          <div
            key={effect.id}
            className={`effect effect-${effect.type}`}
            style={{ left: effect.x, top: effect.y }}
          >
            {effect.type === 'hit' && (
              <>
                <span className="score-popup">+{effect.score}</span>
                <div className="particles">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="particle" style={{ '--angle': `${i * 45}deg` } as React.CSSProperties} />
                  ))}
                </div>
              </>
            )}
            {effect.type === 'miss' && <div className="miss-ring" />}
          </div>
        ))}

        {isPaused && (
          <div className="pause-overlay">
            <div className="pause-content">
              <h2>PAUSED</h2>
              <p>Press P or SPACE to continue</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameCanvas;
