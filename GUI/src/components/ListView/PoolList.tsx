import { useState, useMemo } from 'react';
import { PoolTask } from '../../types/task';
import { SearchBar } from './SearchBar';

interface PoolListProps {
  poolTasks: Map<string, PoolTask>;
  onClasificar: (poolTask: PoolTask) => void;
}

export function PoolList({ poolTasks, onClasificar }: PoolListProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const arr = Array.from(poolTasks.values());
    const q = query.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter(t => t.descripcion.toLowerCase().includes(q));
  }, [poolTasks, query]);

  return (
    <>
      <div className="list-view-pane-header">
        <div>
          <span className="list-view-pane-title">Pool</span>
          <span className="list-view-pane-count">
            ({filtered.length}/{poolTasks.size})
          </span>
        </div>
        <div className="list-view-pane-actions">
          <SearchBar value={query} onChange={setQuery} />
        </div>
      </div>
      <div className="list-view-table-wrap">
        {filtered.length === 0 ? (
          <div className="list-view-empty">
            {query ? 'Sin coincidencias' : 'Pool vacío'}
          </div>
        ) : (
          <table className="list-view-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => (
                <tr key={task.filename}>
                  <td className="col-nombre" title={task.filename}>{task.nombre}</td>
                  <td className="col-descripcion">{task.descripcion || '—'}</td>
                  <td>
                    <button
                      className="list-view-clasificar-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClasificar(task);
                      }}
                    >
                      Clasificar →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
