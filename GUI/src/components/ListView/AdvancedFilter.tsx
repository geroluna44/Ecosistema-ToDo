import { useState, useEffect, useRef } from 'react';
import { Tarea, Urgencia } from '../../types/task';
import { formatTasksDisplay } from '../../services/taskService';
import { parseDeadlineInput } from '../../utils/dateFormatting';

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
  tasks: Map<string, Tarea>;
  onApply: (next: ClasificadasFilter) => void;
  onClose: () => void;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function AutocompleteField({
  id,
  label,
  value,
  suggestions,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  suggestions: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="list-view-filter-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        list={`${id}-suggestions`}
      />
      <datalist id={`${id}-suggestions`}>
        {suggestions.map(suggestion => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </div>
  );
}

export function AdvancedFilter({ filter, tasks, onApply, onClose }: AdvancedFilterProps) {
  const [local, setLocal] = useState<ClasificadasFilter>(filter);
  const panelRef = useRef<HTMLDivElement>(null);

  const suggestions = {
    proyecto: unique(Array.from(tasks.values()).map(task => task.Proyecto || '')),
    nombre: unique(Array.from(tasks.values()).map(task => task.Nombre || '')),
    descripcion: unique(Array.from(tasks.values()).map(task => task.Descripcion || '')),
    lugar: unique(Array.from(tasks.values()).map(task => task['Lugar de trabajo'] || '')),
    padre: unique(Array.from(tasks.values()).flatMap(task =>
      (task['Tarea Padre'] || []).map(id => formatTasksDisplay([id], tasks))
    )),
    hija: unique(Array.from(tasks.values()).flatMap(task =>
      (task['Tarea Hija'] || []).map(id => formatTasksDisplay([id], tasks))
    )),
  };

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

      <AutocompleteField
        id="filter-proyecto"
        label="Proyecto"
        value={local.proyecto}
        suggestions={suggestions.proyecto}
        onChange={value => setField('proyecto', value)}
        placeholder="Contiene…"
      />

      <AutocompleteField
        id="filter-nombre"
        label="Nombre"
        value={local.nombre}
        suggestions={suggestions.nombre}
        onChange={value => setField('nombre', value)}
        placeholder="Contiene…"
      />

      <AutocompleteField
        id="filter-descripcion"
        label="Descripción"
        value={local.descripcion}
        suggestions={suggestions.descripcion}
        onChange={value => setField('descripcion', value)}
        placeholder="Contiene…"
      />

      <AutocompleteField
        id="filter-lugar"
        label="Lugar de trabajo"
        value={local.lugar}
        suggestions={suggestions.lugar}
        onChange={value => setField('lugar', value)}
        placeholder="Contiene…"
      />

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

      <AutocompleteField
        id="filter-padre"
        label="Tarea Padre"
        value={local.padre}
        suggestions={suggestions.padre}
        onChange={value => setField('padre', value)}
        placeholder="Contiene…"
      />

      <AutocompleteField
        id="filter-hija"
        label="Tarea Hija"
        value={local.hija}
        suggestions={suggestions.hija}
        onChange={value => setField('hija', value)}
        placeholder="Contiene…"
      />

      <div className="list-view-filter-field">
        <label>Deadline mínimo (dd/mm hh:mm)</label>
        <input
          type="text"
          value={local.deadlineMin}
          onChange={e => setField('deadlineMin', e.target.value)}
          placeholder="06/08 00:00"
        />
      </div>

      <div className="list-view-filter-field">
        <label>Deadline máximo (dd/mm hh:mm)</label>
        <input
          type="text"
          value={local.deadlineMax}
          onChange={e => setField('deadlineMax', e.target.value)}
          placeholder="31/12 23:59"
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

  const minN = filter.deadlineMin ? parseDeadlineInput(filter.deadlineMin) : null;
  const maxN = filter.deadlineMax ? parseDeadlineInput(filter.deadlineMax) : null;

  return tasks.filter(([_, task]) => {
    if (!contains(task.Proyecto, filter.proyecto)) return false;
    if (!contains(task.Nombre, filter.nombre)) return false;
    if (!contains(task.Descripcion, filter.descripcion)) return false;
    if (!contains(task['Lugar de trabajo'], filter.lugar)) return false;
    if (!contains(formatTasksDisplay(task['Tarea Padre'] || [], allTasks), filter.padre)) return false;
    if (!contains(formatTasksDisplay(task['Tarea Hija'] || [], allTasks), filter.hija)) return false;
    if (filter.urgencia && task.Urgencia !== filter.urgencia) return false;
    if (minN !== null && (!task.Deadline || task.Deadline < minN)) return false;
    if (maxN !== null && (!task.Deadline || task.Deadline > maxN)) return false;
    return true;
  });
}
