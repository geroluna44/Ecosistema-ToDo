import { useState, useEffect, useCallback, useMemo } from 'react';
import { Tarea } from '../types/task';
import { readPapeleraTasks, restoreTask, restoreProject, deleteTask } from '../services/taskService';
import '../styles/papelera-view.css';

interface PapeleraViewProps {
  onBack: () => void;
  onEmptyTrash: () => void;
  onReload?: () => void;
}

export function PapeleraView({ onBack, onEmptyTrash: onEmptyTrashProp, onReload }: PapeleraViewProps) {
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
      onReload?.();
    } catch (e) {
      setError(String(e));
    }
  };

  const handlePermanentDelete = async (filename: string) => {
    if (!confirm(`¿Eliminar permanentemente esta tarea? No se podrá recuperar.`)) return;
    try {
      await deleteTask(`papelera/${filename}`);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm(`¿Vaciar la papelera? Se eliminarán todas las tareas permanentemente.`)) return;
    try {
      await onEmptyTrashProp();
      setTasks(new Map());
    } catch (e) {
      setError(String(e));
    }
  };

  const handleRestoreProject = async (proyecto: string) => {
    try {
      await restoreProject(proyecto);
      load();
      onReload?.();
    } catch (e) {
      setError(String(e));
    }
  };

  const projectsInTrash = useMemo(() => {
    if (!tasks) return [];
    const projects = new Set<string>();
    tasks.forEach((task) => {
      if (task.Proyecto) projects.add(task.Proyecto);
    });
    return Array.from(projects).sort();
  }, [tasks]);

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
          <div className="papelera-toolbar">
            {projectsInTrash.length > 0 && (
              <div className="papelera-projects">
                {projectsInTrash.map((proyecto) => (
                  <button
                    key={proyecto}
                    className="papelera-restore-project-btn"
                    onClick={() => handleRestoreProject(proyecto)}
                    title={`Restaurar proyecto "${proyecto}"`}
                  >
                    ↩️ {proyecto}
                  </button>
                ))}
              </div>
            )}
            <button className="papelera-empty-btn" onClick={handleEmptyTrash}>
              🗑️ Vaciar papelera
            </button>
          </div>
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
              <div className="papelera-item-actions">
                <button
                  className="papelera-restore-btn"
                  onClick={() => handleRestore(filename)}
                >
                  ↩️ Restaurar
                </button>
                <button
                  className="papelera-delete-btn"
                  onClick={() => handlePermanentDelete(filename)}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
