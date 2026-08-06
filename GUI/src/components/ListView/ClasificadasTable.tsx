import { useState, useMemo, useRef, useEffect } from 'react';
import { Tarea } from '../../types/task';
import { AdvancedFilter, ClasificadasFilter, EMPTY_FILTER, applyFilter } from './AdvancedFilter';
import { formatTasksDisplay } from '../../services/taskService';
import { formatDeadline, formatDuration } from '../../utils/dateFormatting';

type SortColumn = 'id' | 'nombre' | 'lugar' | 'proyecto' | 'descripcion' | 'primerPaso' | 'rangoTiempo' | 'postergaciones' | 'urgencia' | 'padre' | 'hija' | 'deadline';
type SortDir = 'asc' | 'desc';

const COLUMN_META: Record<SortColumn, { label: string }> = {
  id:              { label: 'ID' },
  nombre:          { label: 'Nombre' },
  lugar:           { label: 'Lugar' },
  proyecto:        { label: 'Proyecto' },
  descripcion:     { label: 'Descripción' },
  primerPaso:      { label: 'Primer paso' },
  rangoTiempo:     { label: 'Rango tiempo' },
  postergaciones:  { label: 'Postergaciones' },
  urgencia:        { label: 'Urgencia' },
  padre:           { label: 'Tarea Padre' },
  hija:            { label: 'Tarea Hija' },
  deadline:        { label: 'Deadline' },
};

const ALWAYS_VISIBLE: SortColumn[] = ['id', 'nombre'];
const TOGGLEABLE_COLUMNS: SortColumn[] = ['lugar', 'proyecto', 'descripcion', 'primerPaso', 'rangoTiempo', 'postergaciones', 'urgencia', 'padre', 'hija', 'deadline'];
const DEFAULT_VISIBLE: SortColumn[] = ['id', 'nombre', 'proyecto', 'descripcion', 'urgencia', 'padre', 'hija', 'deadline'];
const FILTER_STORAGE_KEY = 'clasificadasAdvancedFilter';

function loadPersistedFilter(): ClasificadasFilter {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!saved) return EMPTY_FILTER;
    const parsed = JSON.parse(saved) as Partial<ClasificadasFilter>;
    return {
      ...EMPTY_FILTER,
      ...Object.fromEntries(
        Object.entries(parsed).filter(([key, value]) => key in EMPTY_FILTER && typeof value === 'string')
      ),
    } as ClasificadasFilter;
  } catch {
    return EMPTY_FILTER;
  }
}

interface ClasificadasTableProps {
  tasks: Map<string, Tarea>;
  onEdit: (filename: string) => void;
  onTrash: (filename: string) => void;
  onToggleComplete: (filename: string) => void;
}

function getDeadlineClass(value: number | undefined): string {
  if (!value) return '';
  const digits = String(value);
  if (digits.length < 8) return '';

  const taskDate = new Date(
    Number(digits.slice(0, 4)),
    Number(digits.slice(4, 6)) - 1,
    Number(digits.slice(6, 8)),
    Number(digits.slice(8, 10) || 0),
    Number(digits.slice(10, 12) || 0),
  );
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isOverdue = taskDate < today;
  const isToday = taskDate.getFullYear() === today.getFullYear() &&
    taskDate.getMonth() === today.getMonth() &&
    taskDate.getDate() === today.getDate();
  return isOverdue ? 'overdue' : isToday ? 'today' : '';
}

function compareValue(a: Tarea, b: Tarea, column: SortColumn, tasks: Map<string, Tarea>): number {
  switch (column) {
    case 'id':
      return 0;
    case 'nombre':
      return a.Nombre.localeCompare(b.Nombre);
    case 'lugar':
      return (a['Lugar de trabajo'] || '').localeCompare(b['Lugar de trabajo'] || '');
    case 'proyecto':
      return (a.Proyecto || '').localeCompare(b.Proyecto || '');
    case 'descripcion':
      return (a.Descripcion || '').localeCompare(b.Descripcion || '');
    case 'primerPaso':
      return (a['Primer paso'] || '').localeCompare(b['Primer paso'] || '');
    case 'rangoTiempo':
      return (a['Rango de tiempo'] || 0) - (b['Rango de tiempo'] || 0);
    case 'postergaciones':
      return (a.Postergaciones || 0) - (b.Postergaciones || 0);
    case 'urgencia': {
      const order = { A: 0, B: 1, C: 2 } as const;
      return (order[a.Urgencia] ?? 99) - (order[b.Urgencia] ?? 99);
    }
    case 'padre':
      return formatTasksDisplay(a['Tarea Padre'] || [], tasks).localeCompare(formatTasksDisplay(b['Tarea Padre'] || [], tasks));
    case 'hija':
      return formatTasksDisplay(a['Tarea Hija'] || [], tasks).localeCompare(formatTasksDisplay(b['Tarea Hija'] || [], tasks));
    case 'deadline':
      return (a.Deadline || 0) - (b.Deadline || 0);
  }
}

function SortableTh({
  column,
  label,
  sortColumn,
  sortDir,
  onSort,
}: {
  column: SortColumn;
  label: string;
  sortColumn: SortColumn;
  sortDir: SortDir;
  onSort: (col: SortColumn) => void;
}) {
  const isActive = sortColumn === column;
  const indicator = isActive ? (sortDir === 'asc' ? '▲' : '▼') : '↕';
  return (
    <th onClick={() => onSort(column)} title={`Ordenar por ${label}`}>
      {label}
      <span className={`sort-indicator ${isActive ? 'active' : ''}`}>{indicator}</span>
    </th>
  );
}

export function ClasificadasTable({ tasks, onEdit, onTrash, onToggleComplete }: ClasificadasTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('urgencia');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState<ClasificadasFilter>(loadPersistedFilter);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<SortColumn>>(() => new Set(DEFAULT_VISIBLE));
  const popupRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filter));
    } catch {}
  }, [filter]);

  useEffect(() => {
    if (!selectedFilename) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setSelectedFilename(null);
        setPopupPosition(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selectedFilename]);

  const handleRowClick = (filename: string, e: React.MouseEvent<HTMLTableRowElement>) => {
    if (selectedFilename === filename) {
      setSelectedFilename(null);
      setPopupPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = tableRef.current?.getBoundingClientRect();
    if (containerRect) {
      setPopupPosition({
        top: rect.top - containerRect.top + rect.height / 2,
        left: rect.left - containerRect.left + rect.width / 2,
      });
    }
    setSelectedFilename(filename);
  };

  const handleTrash = (filename: string) => {
    setSelectedFilename(null);
    setPopupPosition(null);
    onTrash(filename);
  };

  const handleEdit = (filename: string) => {
    setSelectedFilename(null);
    setPopupPosition(null);
    onEdit(filename);
  };

  const handleToggleComplete = (filename: string) => {
    setSelectedFilename(null);
    setPopupPosition(null);
    onToggleComplete(filename);
  };

  const toggleColumn = (col: SortColumn) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(col)) {
        if (ALWAYS_VISIBLE.includes(col)) return prev;
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  };

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDir('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const arr = Array.from(tasks.entries());
    const filtered = applyFilter(arr, filter, tasks);
    if (sortColumn === 'id') {
      filtered.sort((a, b) => sortDir === 'asc' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]));
    } else {
      filtered.sort((a, b) => {
        const cmp = compareValue(a[1], b[1], sortColumn, tasks);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return filtered;
  }, [tasks, filter, sortColumn, sortDir]);

  const isFilterActive =
    filter.proyecto !== '' ||
    filter.nombre !== '' ||
    filter.descripcion !== '' ||
    filter.lugar !== '' ||
    filter.urgencia !== '' ||
    filter.padre !== '' ||
    filter.hija !== '' ||
    filter.deadlineMin !== '' ||
    filter.deadlineMax !== '';

  return (
    <>
      <div className="list-view-pane-header">
        <div>
          <span className="list-view-pane-title">Clasificadas</span>
          <span className="list-view-pane-count">
            ({filteredAndSorted.length}/{tasks.size})
          </span>
        </div>
        <div className="list-view-pane-actions">
          <div className="list-view-toolbar-relative">
            <button
              className={`list-view-filter-btn ${filterOpen || isFilterActive ? 'active' : ''}`}
              onClick={() => setFilterOpen(o => !o)}
            >
              {isFilterActive ? 'Filtro avanzado ●' : 'Filtro avanzado'}
            </button>
            {filterOpen && (
              <AdvancedFilter
                filter={filter}
                tasks={tasks}
                onApply={(next) => {
                  setFilter(next);
                  setFilterOpen(false);
                }}
                onClose={() => setFilterOpen(false)}
              />
            )}
          </div>
        </div>
      </div>
      <div className="list-view-column-toggles">
        {TOGGLEABLE_COLUMNS.map(col => (
          <button
            key={col}
            className={`list-view-col-toggle ${visibleColumns.has(col) ? 'active' : ''}`}
            onClick={() => toggleColumn(col)}
          >
            {COLUMN_META[col].label}
          </button>
        ))}
      </div>
      <div className="list-view-table-wrap" ref={tableRef}>
        {filteredAndSorted.length === 0 ? (
          <div className="list-view-empty">Sin tareas para mostrar</div>
        ) : (
          <table className="list-view-table">
            <thead>
              <tr>
                {ALWAYS_VISIBLE.map(col => (
                  <SortableTh key={col} column={col} label={COLUMN_META[col].label} sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} />
                ))}
                {TOGGLEABLE_COLUMNS.filter(col => visibleColumns.has(col)).map(col => (
                  <SortableTh key={col} column={col} label={COLUMN_META[col].label} sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} />
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map(([filename, task]) => {
                const deadline = formatDeadline(task.Deadline);
                return (
                  <tr
                    key={filename}
                    onClick={(e) => handleRowClick(filename, e)}
                    className={[
                      selectedFilename === filename ? 'selected' : '',
                      task.completado ? 'completed' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <td className="col-id" title={filename}>{filename}</td>
                    <td className="col-nombre" title={task.Nombre}>{task.Nombre || '—'}</td>
                    {visibleColumns.has('lugar') && (
                      <td className="col-rel" title={task['Lugar de trabajo']}>{task['Lugar de trabajo'] || '—'}</td>
                    )}
                    {visibleColumns.has('proyecto') && (
                      <td className="col-proyecto" title={task.Proyecto}>{task.Proyecto || '—'}</td>
                    )}
                    {visibleColumns.has('descripcion') && (
                      <td className="col-descripcion">{task.Descripcion || '—'}</td>
                    )}
                    {visibleColumns.has('primerPaso') && (
                      <td className="col-rel" title={task['Primer paso']}>{task['Primer paso'] || '—'}</td>
                    )}
                    {visibleColumns.has('rangoTiempo') && (
                      <td className="col-num">{formatDuration(task['Rango de tiempo'])}</td>
                    )}
                    {visibleColumns.has('postergaciones') && (
                      <td className="col-num">{task.Postergaciones ?? '—'}</td>
                    )}
                    {visibleColumns.has('urgencia') && (
                      <td className="col-urgencia">
                        <span className={`badge-urg urgency-${(task.Urgencia || 'c').toLowerCase()}`}>
                          {task.Urgencia || '?'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.has('padre') && (
                      <td className="col-rel" title={formatTasksDisplay(task['Tarea Padre'] || [], tasks)}>{formatTasksDisplay(task['Tarea Padre'] || [], tasks) || '—'}</td>
                    )}
                    {visibleColumns.has('hija') && (
                      <td className="col-rel" title={formatTasksDisplay(task['Tarea Hija'] || [], tasks)}>{formatTasksDisplay(task['Tarea Hija'] || [], tasks) || '—'}</td>
                    )}
                    {visibleColumns.has('deadline') && (
                      <td className="col-deadline">
                        <span className={`list-view-deadline-cell ${getDeadlineClass(task.Deadline)}`}>
                          {deadline === 'Sin fecha' ? '—' : deadline}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {selectedFilename && popupPosition && (
          <div
            ref={popupRef}
            className="row-action-popup"
            style={{ top: popupPosition.top, left: popupPosition.left }}
          >
            <button
              className="row-action-btn trash"
              onClick={(e) => { e.stopPropagation(); handleTrash(selectedFilename); }}
              title="Enviar a papelera"
            >
              🗑
            </button>
            <button
              className={`row-action-btn complete ${tasks.get(selectedFilename)?.completado ? 'completed' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleToggleComplete(selectedFilename); }}
              title={tasks.get(selectedFilename)?.completado ? 'Desmarcar realizada' : 'Marcar como realizada'}
            >
              ✓
            </button>
            <button
              className="row-action-btn edit"
              onClick={(e) => { e.stopPropagation(); handleEdit(selectedFilename); }}
              title="Editar tarea"
            >
              ✏
            </button>
          </div>
        )}
      </div>
    </>
  );
}
