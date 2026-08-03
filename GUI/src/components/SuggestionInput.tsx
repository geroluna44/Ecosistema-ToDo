import { useState, useRef, useEffect, useMemo } from 'react';
import './task-reference-input.css';

interface SuggestionInputProps {
  id?: string;
  label: string;
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SuggestionInput({ id, label, value, suggestions, onChange, placeholder }: SuggestionInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return suggestions.slice(0, 20);
    return suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 20);
  }, [query, suggestions]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
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
          handleSelect(filtered[highlightedIndex]);
        } else if (query.trim()) {
          handleSelect(query.trim());
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleBlur = () => {
    if (query.trim()) {
      onChange(query.trim());
      setQuery('');
    }
    setIsOpen(false);
  };

  return (
    <div className="task-ref-container" ref={containerRef}>
      <label htmlFor={id}>{label}</label>
      <div className="task-ref-input-wrap">
        {value && (
          <span className="task-ref-selected">
            <span className="task-ref-selected-name" title={value}>
              {value}
            </span>
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
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={value ? '' : (placeholder || 'Escribir...')}
        />
      </div>
      {isOpen && filtered.length > 0 && (
        <ul className="task-ref-dropdown">
          {filtered.map((entry, i) => (
            <li
              key={entry}
              className={`task-ref-option ${i === highlightedIndex ? 'highlighted' : ''} ${entry === value ? 'selected' : ''}`}
              onMouseDown={() => handleSelect(entry)}
              onMouseEnter={() => setHighlightedIndex(i)}
            >
              <span className="task-ref-option-name">{entry}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
