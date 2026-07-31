import { useEffect, useRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      className="list-view-search-input"
      placeholder="Buscar en descripción…"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}
