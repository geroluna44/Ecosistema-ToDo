import { useState } from 'react';

interface TextZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export function TextZoomControls({ zoom, onZoomIn, onZoomOut, onZoomReset }: TextZoomControlsProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className={`text-zoom-controls ${open ? 'expanded' : 'collapsed'}`}>
      {open ? (
        <>
          <div className="text-zoom-controls-body">
            <button
              className="text-zoom-controls-btn"
              onClick={onZoomOut}
              title="Achicar texto"
              disabled={zoom <= 0.5}
            >
              −
            </button>
            <button
              className="text-zoom-controls-level"
              onClick={onZoomReset}
              title="Restablecer 100%"
            >
              {Math.round(clamp(zoom, 0.5, 2) * 100)}%
            </button>
            <button
              className="text-zoom-controls-btn"
              onClick={onZoomIn}
              title="Agrandar texto"
              disabled={zoom >= 2}
            >
              +
            </button>
          </div>
          <div className="text-zoom-controls-divider" />
          <button
            className="text-zoom-controls-toggle"
            onClick={() => setOpen(false)}
            title="Replegar"
          >
            ◀
          </button>
        </>
      ) : (
        <button
          className="text-zoom-controls-toggle"
          onClick={() => setOpen(true)}
          title="Desplegar"
        >
          ▶
        </button>
      )}
    </div>
  );
}
