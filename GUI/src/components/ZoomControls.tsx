import { useState } from 'react';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onZoomReset }: ZoomControlsProps) {
  const [minimized, setMinimized] = useState(false);

  return (
    <div className={`zoom-controls ${minimized ? 'minimized' : ''}`}>
      <div className="zoom-buttons">
        <button className="zoom-btn" onClick={onZoomOut} title="Zoom out">−</button>
        <button className="zoom-level" onClick={onZoomReset} title="Reset zoom">{Math.round(zoom * 100)}%</button>
        <button className="zoom-btn" onClick={onZoomIn} title="Zoom in">+</button>
      </div>
      <button
        className="zoom-controls-toggle"
        onClick={() => setMinimized(!minimized)}
        title={minimized ? 'Mostrar controles' : 'Ocultar controles'}
      >
        {minimized ? '▶' : '◀'}
      </button>
    </div>
  );
}