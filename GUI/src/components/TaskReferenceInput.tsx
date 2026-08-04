import { useState, useRef, useEffect, useMemo } from 'react';
import { Tarea } from '../types/task';
import './task-reference-input.css';

interface TaskReferenceInputProps {
  id?: string;
  label: string;
  value: string[];
  tasks: Map<string, Tarea>;
  onChange: (taskIds: string[]) => void;
  placeholder?: string;
}

export function TaskReferenceInput({ id, label, value, tasks, onChange, placeholder }: TaskReferenceInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const safeValue = Array.isArray(value) ? value : (typeof value === 'string' && value ? [value] : []);
  const selectedTasks = safeValue.filter(id => tasks.has(id)).map(id => ({ id, nombre: tasks.get(id)!.Nombre }));

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const entries: Array<{ id: string; nombre: string }> = [];
    tasks.forEach((task, id) => {
      if (!safeValue.includes(id) && (!q || task.Nombre.toLowerCase().includes(q) || id.toLowerCase().includes(q))) {
        entries.push({ id, nombre: task.Nombre });
      }
    });
    return entries.slice(0, 20);
  }, [query, tasks, safeValue]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (taskId: string) => {
    onChange([...safeValue, taskId]);
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  const handleRemove = (taskId: string) => {
    onChange(safeValue.filter(id => id !== taskId));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="task-ref-container" ref={containerRef}>
      <label htmlFor={id}>{label}</label>
      <div className="task-ref-input-wrap">
        {selectedTasks.map(task => (
          <span key={task.id} className="task-ref-selected">
            <span className="task-ref-selected-name" title={`${task.nombre} (${task.id})`}>
              {task.nombre}
            </span>
            <span className="task-ref-id">{task.id}</span>
            <button type="button" className="task-ref-clear" onClick={() => handleRemove(task.id)}>×</button>
          </span>
        ))}
        <input
          id={id}
          ref={inputRef}
          type="text"
          className="task-ref-input"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => { if (query || selectedTasks.length === 0) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={selectedTasks.length > 0 ? '' : (placeholder || 'Escribir nombre...')}
          disabled={false}
        />
      </div>
      {isOpen && filtered.length > 0 && (
        <ul className="task-ref-dropdown">
          {filtered.map((entry, i) => (
            <li
              key={entry.id}
              className={`task-ref-option ${i === highlightedIndex ? 'highlighted' : ''} ${safeValue.includes(entry.id) ? 'selected' : ''}`}
              onMouseDown={() => handleSelect(entry.id)}
              onMouseEnter={() => setHighlightedIndex(i)}
            >
              <span className="task-ref-option-name">{entry.nombre}</span>
              <span className="task-ref-option-id">{entry.id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
