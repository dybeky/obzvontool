import React from 'react';
import type { Target as TargetType } from '../types';

interface TargetProps {
  target: TargetType;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function Target({ target, onClick }: TargetProps): React.ReactElement {
  return (
    <div
      className="target"
      style={{
        left: target.x - target.size / 2,
        top: target.y - target.size / 2,
        width: target.size,
        height: target.size,
        '--lifetime': `${target.lifetime}ms`
      } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="target-outer" />
      <div className="target-middle" />
      <div className="target-inner" />
      <div className="target-center" />
      <div className="target-shrink" />
    </div>
  );
}

export default Target;
