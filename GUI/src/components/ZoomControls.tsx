import { useState, useRef, useCallback, useEffect } from 'react';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onPanBy: (dx: number, dy: number) => void;
  onPanHome: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onZoomReset, onPanBy, onPanHome }: ZoomControlsProps) {
  const [minimized, setMinimized] = useState(() => {
    try {
      return localStorage.getItem('zoomControlsMinimized') === 'true';
    } catch {
      return false;
    }
  });
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('zoomControlsMinimized', String(minimized));
    } catch {}
  }, [minimized]);

  const startPan = useCallback((dx: number, dy: number) => {
    const step = 60 / zoom;
    onPanBy(dx * step, dy * step);
    intervalRef.current = window.setInterval(() => {
      onPanBy(dx * step, dy * step);
    }, 120);
  }, [zoom, onPanBy]);

  const stopPan = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return (
    <div className={`zoom-controls ${minimized ? 'minimized' : ''}`}>
      <div className="zoom-controls-body">
        <div className="dpad-grid">
          <div />
          <button
            className="dpad-btn"
            onMouseDown={() => startPan(0, 1)}
            onMouseUp={stopPan}
            onMouseLeave={stopPan}
            onTouchStart={() => startPan(0, 1)}
            onTouchEnd={stopPan}
            onTouchCancel={stopPan}
            title="Arriba"
          >↑</button>
          <div />
          <button
            className="dpad-btn"
            onMouseDown={() => startPan(1, 0)}
            onMouseUp={stopPan}
            onMouseLeave={stopPan}
            onTouchStart={() => startPan(1, 0)}
            onTouchEnd={stopPan}
            onTouchCancel={stopPan}
            title="Derecha"
          >←</button>
          <button
            className="dpad-btn dpad-home"
            onClick={onPanHome}
            title="Centrar"
          >●</button>
          <button
            className="dpad-btn"
            onMouseDown={() => startPan(-1, 0)}
            onMouseUp={stopPan}
            onMouseLeave={stopPan}
            onTouchStart={() => startPan(-1, 0)}
            onTouchEnd={stopPan}
            onTouchCancel={stopPan}
            title="Izquierda"
          >→</button>
          <div />
          <button
            className="dpad-btn"
            onMouseDown={() => startPan(0, -1)}
            onMouseUp={stopPan}
            onMouseLeave={stopPan}
            onTouchStart={() => startPan(0, -1)}
            onTouchEnd={stopPan}
            onTouchCancel={stopPan}
            title="Abajo"
          >↓</button>
          <div />
        </div>
        <div className="zoom-buttons">
          <button className="zoom-btn" onClick={onZoomOut} title="Zoom out">−</button>
          <button className="zoom-level" onClick={onZoomReset} title="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button className="zoom-btn" onClick={onZoomIn} title="Zoom in">+</button>
        </div>
      </div>
      <button
        className="zoom-controls-toggle"
        onClick={() => setMinimized(!minimized)}
        title={minimized ? 'Mostrar controles' : 'Ocultar controles'}
        aria-label={minimized ? 'Mostrar controles de zoom' : 'Ocultar controles de zoom'}
      >
        {minimized ? '›' : '‹'}
      </button>
    </div>
  );
}
