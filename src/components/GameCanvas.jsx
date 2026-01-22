import React, { useState, useEffect, useRef, useCallback } from 'react';
import HUD from './HUD';
import Target from './Target';

function GameCanvas({ settings, duration, stats, updateStats, isPaused, onGameEnd }) {
  const [targets, setTargets] = useState([]);
  const [effects, setEffects] = useState([]);
  const [timeLeft, setTimeLeft] = useState(duration);
  const canvasRef = useRef(null);
  const spawnIntervalRef = useRef(null);
  const gameTimerRef = useRef(null);
  const targetIdRef = useRef(0);

  // Calculate score based on reaction time
  const calculateScore = (reactionTime) => {
    if (reactionTime < 200) return 50;
    if (reactionTime < 400) return 35;
    if (reactionTime < 700) return 22;
    return 12;
  };

  // Spawn a new target
  const spawnTarget = useCallback(() => {
    if (isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const padding = settings.targetSize;
    const x = padding + Math.random() * (rect.width - padding * 2);
    const y = padding + Math.random() * (rect.height - padding * 2);

    const newTarget = {
      id: targetIdRef.current++,
      x,
      y,
      size: settings.targetSize,
      spawnTime: Date.now(),
      lifetime: settings.lifetime
    };

    setTargets(prev => [...prev, newTarget]);

    // Auto-remove target after lifetime (miss)
    setTimeout(() => {
      setTargets(prev => {
        const target = prev.find(t => t.id === newTarget.id);
        if (target) {
          // Target expired - it's a miss
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
  }, [settings, isPaused, stats.misses, updateStats]);

  // Add visual effect
  const addEffect = useCallback((x, y, type, score = 0) => {
    const effectId = Date.now() + Math.random();
    setEffects(prev => [...prev, { id: effectId, x, y, type, score }]);

    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== effectId));
    }, 500);
  }, []);

  // Handle target click (hit)
  const handleTargetClick = useCallback((target, e) => {
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

  // Handle canvas click (miss)
  const handleCanvasClick = useCallback((e) => {
    if (isPaused) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateStats({
      misses: stats.misses + 1,
      combo: 0
    });

    addEffect(x, y, 'miss');
  }, [isPaused, stats.misses, updateStats, addEffect]);

  // Start/stop spawn interval
  useEffect(() => {
    if (!isPaused) {
      spawnIntervalRef.current = setInterval(spawnTarget, settings.spawnInterval);
      spawnTarget(); // Spawn first target immediately
    }

    return () => {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
      }
    };
  }, [isPaused, settings.spawnInterval, spawnTarget]);

  // Game timer
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
                    <div key={i} className="particle" style={{ '--angle': `${i * 45}deg` }} />
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
