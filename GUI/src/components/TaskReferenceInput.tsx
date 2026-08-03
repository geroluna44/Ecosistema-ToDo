import { useState, useRef, useEffect, useMemo } from 'react';
import { Tarea } from '../types/task';
import './task-reference-input.css';

interface TaskReferenceInputProps {
  id?: string;
  label: string;
  value: string;
  tasks: Map<string, Tarea>;
  onChange: (taskId: string) => void;
  placeholder?: string;
}

export function TaskReferenceInput({ id, label, value, tasks, onChange, placeholder }: TaskReferenceInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTask = value ? tasks.get(value) : null;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const entries: Array<{ id: string; nombre: string }> = [];
    tasks.forEach((task, id) => {
      if (!q || task.Nombre.toLowerCase().includes(q) || id.toLowerCase().includes(q)) {
        entries.push({ id, nombre: task.Nombre });
      }
    });
    return entries.slice(0, 20);
  }, [query, tasks]);

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
    onChange(taskId);
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
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
        {selectedTask && (
          <span className="task-ref-selected">
            <span className="task-ref-selected-name" title={`${selectedTask.Nombre} (${value})`}>
              {selectedTask.Nombre}
            </span>
            <span className="task-ref-id">{value}</span>
            <button type="button" className="task-ref-clear" onClick={handleClear}>×</button>
          </span>
        )}
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
          onFocus={() => { if (query || !selectedTask) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={selectedTask ? '' : (placeholder || 'Escribir nombre...')}
          disabled={false}
        />
      </div>
      {isOpen && filtered.length > 0 && (
        <ul className="task-ref-dropdown">
          {filtered.map((entry, i) => (
            <li
              key={entry.id}
              className={`task-ref-option ${i === highlightedIndex ? 'highlighted' : ''} ${entry.id === value ? 'selected' : ''}`}
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
