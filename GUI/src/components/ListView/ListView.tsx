import { useState, useRef, useEffect } from 'react';
import { Tarea, PoolTask, ListMode } from '../../types/task';
import { ClasificadasTable } from './ClasificadasTable';
import { PoolList } from './PoolList';
import { ClasificarTaskForm } from './ClasificarTaskForm';
import { TextZoomControls } from './TextZoomControls';
import './list-view.css';

interface ListViewProps {
  tasks: Map<string, Tarea>;
  poolTasks: Map<string, PoolTask>;
  onEdit: (filename: string) => void;
  onTrash: (filename: string) => void;
  onToggleComplete: (filename: string) => void;
  onReload: () => void;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

const MODE_LABELS: Record<ListMode, string> = {
  clasificadas: 'Clasificadas',
  pool: 'Pool',
  both: 'Clasificadas + Pool',
};

export function ListView({ tasks, poolTasks, onEdit, onTrash, onToggleComplete, onReload }: ListViewProps) {
  const [mode, setMode] = useState<ListMode>('clasificadas');
  const [modeOpen, setModeOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [clasificarTarget, setClasificarTarget] = useState<PoolTask | null>(null);

  const modeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modeOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) {
        setModeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [modeOpen]);

  const zoomIn = () => setZoom(z => clamp(z + 0.1, 0.5, 2));
  const zoomOut = () => setZoom(z => clamp(z - 0.1, 0.5, 2));
  const zoomReset = () => setZoom(1);

  const fontSize = `${Math.round(zoom * 100)}%`;

  const renderClasificadas = () => (
    <div className="list-view-pane">
      <ClasificadasTable tasks={tasks} onEdit={onEdit} onTrash={onTrash} onToggleComplete={onToggleComplete} />
    </div>
  );

  const renderPool = () => (
    <div className="list-view-pane">
      <PoolList
        poolTasks={poolTasks}
        onClasificar={(task) => setClasificarTarget(task)}
      />
    </div>
  );

  return (
    <div className="list-view" style={{ fontSize }}>
      <div className={`list-view-content ${mode === 'both' ? 'both' : 'single'}`}>
        {mode === 'clasificadas' && renderClasificadas()}
        {mode === 'pool' && renderPool()}
        {mode === 'both' && (
          <>
            {renderPool()}
            {renderClasificadas()}
          </>
        )}
      </div>

      <div className="list-view-mode-selector" ref={modeRef}>
        <button
          className="list-view-mode-btn"
          onClick={() => setModeOpen(o => !o)}
        >
          {MODE_LABELS[mode]} ▾
        </button>
        {modeOpen && (
          <ul className="list-view-mode-menu">
            {(['clasificadas', 'pool', 'both'] as ListMode[]).map(m => (
              <li
                key={m}
                className={`list-view-mode-option ${m === mode ? 'active' : ''}`}
                onClick={() => {
                  setMode(m);
                  setModeOpen(false);
                }}
              >
                {MODE_LABELS[m]}
              </li>
            ))}
          </ul>
        )}
      </div>

      <TextZoomControls
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
      />

      {clasificarTarget && (
        <ClasificarTaskForm
          poolTask={clasificarTarget}
          tasks={tasks}
          onClose={() => setClasificarTarget(null)}
          onClasificado={() => {
            setClasificarTarget(null);
            onReload();
          }}
        />
      )}
    </div>
  );
}
