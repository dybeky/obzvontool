import React, { useMemo } from 'react';

function AnimatedBackground() {
  const blobs = useMemo(() => {
    const items = [];
    const count = 6;

    for (let i = 0; i < count; i++) {
      const size = Math.random() * 300 + 350;
      const left = Math.random() * 120 - 10;
      const top = Math.random() * 120 - 10;
      const duration = Math.random() * 8 + 18;
      const delay = Math.random() * -15;
      const gradientClass = `gradient-${(i % 4) + 1}`;

      items.push({
        id: i,
        size,
        left,
        top,
        duration,
        delay,
        gradientClass
      });
    }

    return items;
  }, []);

  const particles = useMemo(() => {
    const items = [];
    const count = 25;

    for (let i = 0; i < count; i++) {
      items.push({
        id: i,
        left: Math.random() * 100,
        duration: Math.random() * 15 + 10,
        delay: Math.random() * -20,
        size: Math.random() * 3 + 2
      });
    }

    return items;
  }, []);

  const orbs = useMemo(() => {
    const items = [];
    const count = 8;
    const colors = [
      'rgba(235, 110, 101, 0.8)',
      'rgba(201, 107, 154, 0.8)',
      'rgba(75, 92, 191, 0.8)',
      'rgba(124, 58, 237, 0.8)'
    ];

    for (let i = 0; i < count; i++) {
      items.push({
        id: i,
        left: Math.random() * 90 + 5,
        top: Math.random() * 90 + 5,
        size: Math.random() * 8 + 4,
        color: colors[i % colors.length],
        pulseDuration: Math.random() * 3 + 2,
        driftDuration: Math.random() * 10 + 15,
        delay: Math.random() * -10
      });
    }

    return items;
  }, []);

  return (
    <div className="animated-background">
      {/* Color blobs */}
      {blobs.map((blob) => (
        <div
          key={blob.id}
          className={`color-blob ${blob.gradientClass}`}
          style={{
            width: `${blob.size}px`,
            height: `${blob.size}px`,
            left: `${blob.left}%`,
            top: `${blob.top}%`,
            animationDuration: `${blob.duration}s`,
            animationDelay: `${blob.delay}s`
          }}
        />
      ))}

      {/* Floating particles */}
      <div className="particle-field">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="floating-particle"
            style={{
              left: `${particle.left}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`
            }}
          />
        ))}
      </div>

      {/* Glowing orbs */}
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className="glow-orb"
          style={{
            left: `${orb.left}%`,
            top: `${orb.top}%`,
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            background: orb.color,
            boxShadow: `0 0 ${orb.size * 2}px ${orb.color}`,
            animationDuration: `${orb.pulseDuration}s, ${orb.driftDuration}s`,
            animationDelay: `${orb.delay}s, ${orb.delay}s`
          }}
        />
      ))}
    </div>
  );
}

export default AnimatedBackground;
