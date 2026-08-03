import { useState, useEffect, useRef } from 'react';
import { Tarea, Urgencia } from '../../types/task';
import { formatTaskDisplay } from '../../services/taskService';

export interface ClasificadasFilter {
  proyecto: string;
  nombre: string;
  descripcion: string;
  lugar: string;
  urgencia: '' | Urgencia;
  padre: string;
  hija: string;
  deadlineMin: string;
  deadlineMax: string;
}

export const EMPTY_FILTER: ClasificadasFilter = {
  proyecto: '',
  nombre: '',
  descripcion: '',
  lugar: '',
  urgencia: '',
  padre: '',
  hija: '',
  deadlineMin: '',
  deadlineMax: '',
};

interface AdvancedFilterProps {
  filter: ClasificadasFilter;
  onApply: (next: ClasificadasFilter) => void;
  onClose: () => void;
}

export function AdvancedFilter({ filter, onApply, onClose }: AdvancedFilterProps) {
  const [local, setLocal] = useState<ClasificadasFilter>(filter);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocal(filter);
  }, [filter]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const setField = <K extends keyof ClasificadasFilter>(field: K, value: ClasificadasFilter[K]) => {
    setLocal(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApply(local);
  };

  const handleClear = () => {
    setLocal(EMPTY_FILTER);
    onApply(EMPTY_FILTER);
  };

  return (
    <div className="list-view-filter-panel" ref={panelRef}>
      <div className="list-view-filter-title">Filtro avanzado</div>

      <div className="list-view-filter-field">
        <label>Proyecto</label>
        <input
          type="text"
          value={local.proyecto}
          onChange={e => setField('proyecto', e.target.value)}
          placeholder="Contiene…"
        />
      </div>

      <div className="list-view-filter-field">
        <label>Nombre</label>
        <input
          type="text"
          value={local.nombre}
          onChange={e => setField('nombre', e.target.value)}
          placeholder="Contiene…"
        />
      </div>

      <div className="list-view-filter-field">
        <label>Descripción</label>
        <input
          type="text"
          value={local.descripcion}
          onChange={e => setField('descripcion', e.target.value)}
          placeholder="Contiene…"
        />
      </div>

      <div className="list-view-filter-field">
        <label>Lugar de trabajo</label>
        <input
          type="text"
          value={local.lugar}
          onChange={e => setField('lugar', e.target.value)}
          placeholder="Contiene…"
        />
      </div>

      <div className="list-view-filter-field">
        <label>Urgencia</label>
        <select
          value={local.urgencia}
          onChange={e => setField('urgencia', e.target.value as '' | Urgencia)}
        >
          <option value="">Todas</option>
          <option value="A">A - Alta</option>
          <option value="B">B - Media</option>
          <option value="C">C - Baja</option>
        </select>
      </div>

      <div className="list-view-filter-field">
        <label>Tarea Padre</label>
        <input
          type="text"
          value={local.padre}
          onChange={e => setField('padre', e.target.value)}
          placeholder="Contiene…"
        />
      </div>

      <div className="list-view-filter-field">
        <label>Tarea Hija</label>
        <input
          type="text"
          value={local.hija}
          onChange={e => setField('hija', e.target.value)}
          placeholder="Contiene…"
        />
      </div>

      <div className="list-view-filter-field">
        <label>Deadline mínimo (YYYYMMDD)</label>
        <input
          type="text"
          value={local.deadlineMin}
          onChange={e => setField('deadlineMin', e.target.value)}
          placeholder="20260101"
          maxLength={14}
        />
      </div>

      <div className="list-view-filter-field">
        <label>Deadline máximo (YYYYMMDD)</label>
        <input
          type="text"
          value={local.deadlineMax}
          onChange={e => setField('deadlineMax', e.target.value)}
          placeholder="20261231"
          maxLength={14}
        />
      </div>

      <div className="list-view-filter-actions">
        <button className="list-view-filter-clear" onClick={handleClear}>
          Limpiar
        </button>
        <button className="list-view-filter-apply" onClick={handleApply}>
          Aplicar
        </button>
      </div>
    </div>
  );
}

export function applyFilter(tasks: Array<[string, Tarea]>, filter: ClasificadasFilter, allTasks: Map<string, Tarea>): Array<[string, Tarea]> {
  const contains = (value: string | number | undefined, needle: string) => {
    if (!needle) return true;
    if (value === undefined || value === null) return false;
    return String(value).toLowerCase().includes(needle.toLowerCase());
  };

  const minN = filter.deadlineMin ? parseInt(filter.deadlineMin, 10) : null;
  const maxN = filter.deadlineMax ? parseInt(filter.deadlineMax, 10) : null;

  return tasks.filter(([_, task]) => {
    if (!contains(task.Proyecto, filter.proyecto)) return false;
    if (!contains(task.Nombre, filter.nombre)) return false;
    if (!contains(task.Descripcion, filter.descripcion)) return false;
    if (!contains(task['Lugar de trabajo'], filter.lugar)) return false;
    if (!contains(formatTaskDisplay(task['Tarea Padre'], allTasks), filter.padre)) return false;
    if (!contains(formatTaskDisplay(task['Tarea Hija'], allTasks), filter.hija)) return false;
    if (filter.urgencia && task.Urgencia !== filter.urgencia) return false;
    if (minN !== null && (!task.Deadline || task.Deadline < minN)) return false;
    if (maxN !== null && (!task.Deadline || task.Deadline > maxN)) return false;
    return true;
  });
}
