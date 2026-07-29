import { useState, useEffect, useCallback } from 'react';
import { Tarea } from '../types/task';
import { readPapeleraTasks, restoreTask } from '../services/taskService';
import '../styles/papelera-view.css';

interface PapeleraViewProps {
  onBack: () => void;
}

export function PapeleraView({ onBack }: PapeleraViewProps) {
  const [tasks, setTasks] = useState<Map<string, Tarea> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await readPapeleraTasks();
      setTasks(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRestore = async (filename: string) => {
    try {
      await restoreTask(filename);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="papelera-view">
      <div className="papelera-header">
        <button className="papelera-back-btn" onClick={onBack}>
          ← Volver
        </button>
        <h2 className="papelera-title">Papelera</h2>
      </div>

      {loading && <div className="papelera-loading">Cargando papelera...</div>}

      {error && <div className="papelera-error">Error: {error}</div>}

      {!loading && !error && tasks && tasks.size === 0 && (
        <div className="papelera-empty">La papelera está vacía</div>
      )}

      {!loading && !error && tasks && tasks.size > 0 && (
        <div className="papelera-list">
          {Array.from(tasks.entries()).map(([filename, task]) => (
            <div key={filename} className="papelera-item">
              <div className="papelera-item-header">
                <span className="papelera-item-name">{task.Nombre}</span>
                <span className={`papelera-item-urgency urgency-${task.Urgencia.toLowerCase()}`}>
                  {task.Urgencia}
                </span>
              </div>
              {task.Proyecto && (
                <div className="papelera-item-project">{task.Proyecto}</div>
              )}
              {task.Descripcion && (
                <div className="papelera-item-desc">
                  {task.Descripcion.length > 150
                    ? task.Descripcion.slice(0, 150) + '...'
                    : task.Descripcion}
                </div>
              )}
              <button
                className="papelera-restore-btn"
                onClick={() => handleRestore(filename)}
              >
                Restaurar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
