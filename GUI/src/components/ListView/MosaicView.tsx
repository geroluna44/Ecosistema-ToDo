import { useState } from 'react';
import { Tarea } from '../../types/task';
import { formatTasksDisplay } from '../../services/taskService';
import { formatDeadline, formatDuration } from '../../utils/dateFormatting';
import type { SortColumn } from './ClasificadasTable';

interface MosaicViewProps {
  entries: Array<[string, Tarea]>;
  visibleColumns: Set<SortColumn>;
  tasks: Map<string, Tarea>;
  onEdit: (filename: string) => void;
  onTrash: (filename: string) => void;
  onToggleComplete: (filename: string) => void;
}

function display(value: string | number | undefined): string {
  return value === undefined || value === '' ? '—' : String(value);
}

export function MosaicView({ entries, visibleColumns, tasks, onEdit, onTrash, onToggleComplete }: MosaicViewProps) {
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);

  return (
    <div className="mosaic-grid">
      {entries.map(([filename, task]) => {
        const selected = selectedFilename === filename;
        const parents = formatTasksDisplay(task['Tarea Padre'] || [], tasks);
        const children = formatTasksDisplay(task['Tarea Hija'] || [], tasks);

        return (
          <article
            key={filename}
            className={`mosaic-card ${task.completado ? 'completed' : ''} ${selected ? 'selected' : ''}`}
            onClick={() => setSelectedFilename(selected ? null : filename)}
          >
            <div className="mosaic-card-header">
              <span className={`mosaic-status ${task.completado ? 'completed' : task.Postergaciones > 0 ? 'postponed' : 'available'}`} />
              <h3 className="mosaic-card-title" title={task.Nombre}>{task.Nombre || 'Sin nombre'}</h3>
              {visibleColumns.has('urgencia') && (
                <span className={`badge-urg urgency-${(task.Urgencia || 'c').toLowerCase()}`}>
                  {task.Urgencia || '?'}
                </span>
              )}
            </div>

            <div className="mosaic-card-id" title={filename}>{filename}</div>

            {visibleColumns.has('proyecto') && (
              <div className="mosaic-card-project">{task.Proyecto || 'Sin proyecto'}</div>
            )}
            {visibleColumns.has('descripcion') && task.Descripcion && (
              <p className="mosaic-card-description">{task.Descripcion}</p>
            )}

            <div className="mosaic-card-meta">
              {visibleColumns.has('lugar') && <span>⌖ {display(task['Lugar de trabajo'])}</span>}
              {visibleColumns.has('primerPaso') && task['Primer paso'] && <span>→ {task['Primer paso']}</span>}
              {visibleColumns.has('rangoTiempo') && <span>⏱ {formatDuration(task['Rango de tiempo'])}</span>}
              {visibleColumns.has('deadline') && <span>📅 {formatDeadline(task.Deadline)}</span>}
              {visibleColumns.has('postergaciones') && <span>↻ {task.Postergaciones ?? 0}</span>}
            </div>

            {(visibleColumns.has('padre') || visibleColumns.has('hija')) && (
              <div className="mosaic-card-relations">
                {visibleColumns.has('padre') && parents && <span title={parents}>↑ {parents}</span>}
                {visibleColumns.has('hija') && children && <span title={children}>↓ {children}</span>}
              </div>
            )}

            {selected && (
              <div className="mosaic-card-actions" onClick={e => e.stopPropagation()}>
                <button className="row-action-btn trash" onClick={() => onTrash(filename)} title="Enviar a papelera">🗑</button>
                <button
                  className={`row-action-btn complete ${task.completado ? 'completed' : ''}`}
                  onClick={() => {
                    onToggleComplete(filename);
                    setSelectedFilename(null);
                  }}
                  title={task.completado ? 'Desmarcar realizada' : 'Marcar como realizada'}
                >
                  ✓
                </button>
                <button className="row-action-btn edit" onClick={() => onEdit(filename)} title="Editar tarea">✏</button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
