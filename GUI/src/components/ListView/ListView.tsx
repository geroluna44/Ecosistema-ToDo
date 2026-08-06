import { useState, useRef, useEffect } from 'react';
import { Tarea, PoolTask, ListMode } from '../../types/task';
import { ClasificadasTable } from './ClasificadasTable';
import { PoolList } from './PoolList';
import { ClasificarTaskForm } from './ClasificarTaskForm';
import { PresentationModeToggle } from './PresentationModeToggle';
import './list-view.css';

interface ListViewProps {
  tasks: Map<string, Tarea>;
  poolTasks: Map<string, PoolTask>;
  onEdit: (filename: string) => void;
  onTrash: (filename: string) => void;
  onToggleComplete: (filename: string) => void;
  onReload: () => void;
}

const MODE_LABELS: Record<ListMode, string> = {
  clasificadas: 'Clasificadas',
  pool: 'Pool',
  both: 'Clasificadas + Pool',
};

type ClassifiedViewMode = 'tabla' | 'mosaico';

export function ListView({ tasks, poolTasks, onEdit, onTrash, onToggleComplete, onReload }: ListViewProps) {
  const [mode, setMode] = useState<ListMode>(() => {
    try {
      const saved = localStorage.getItem('listViewMode');
      const validModes: ListMode[] = ['clasificadas', 'pool', 'both'];
      return saved && validModes.includes(saved as ListMode) ? saved as ListMode : 'clasificadas';
    } catch {
      return 'clasificadas';
    }
  });
  const [modeOpen, setModeOpen] = useState(() => {
    try {
      return localStorage.getItem('listViewModeMenuOpen') === 'true';
    } catch {
      return false;
    }
  });
  const [classifiedViewMode, setClassifiedViewMode] = useState<ClassifiedViewMode>(() => {
    try {
      const saved = localStorage.getItem('classifiedViewMode');
      return saved === 'mosaico' ? 'mosaico' : 'tabla';
    } catch {
      return 'tabla';
    }
  });
  const [clasificarTarget, setClasificarTarget] = useState<PoolTask | null>(null);

  const modeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('listViewMode', mode);
    } catch {}
  }, [mode]);

  useEffect(() => {
    try {
      localStorage.setItem('classifiedViewMode', classifiedViewMode);
    } catch {}
  }, [classifiedViewMode]);

  useEffect(() => {
    try {
      localStorage.setItem('listViewModeMenuOpen', String(modeOpen));
    } catch {}
  }, [modeOpen]);

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

  const renderClasificadas = () => (
    <div className="list-view-pane">
      <ClasificadasTable tasks={tasks} viewMode={classifiedViewMode} onEdit={onEdit} onTrash={onTrash} onToggleComplete={onToggleComplete} />
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
    <div className="list-view">
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

      <PresentationModeToggle mode={classifiedViewMode} onChange={setClassifiedViewMode} />

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
