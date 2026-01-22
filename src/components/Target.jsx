import React from 'react';

function Target({ target, onClick }) {
  return (
    <div
      className="target"
      style={{
        left: target.x - target.size / 2,
        top: target.y - target.size / 2,
        width: target.size,
        height: target.size,
        '--lifetime': `${target.lifetime}ms`
      }}
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
