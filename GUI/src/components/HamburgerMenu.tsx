import { useState, useEffect, useRef } from 'react';
import '../styles/hamburger-menu.css';

interface HamburgerMenuProps {
  onSelectPapelera: () => void;
}

export function HamburgerMenu({ onSelectPapelera }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className={`hamburger-menu ${open ? 'open' : ''}`}>
      <button
        className="hamburger-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Menú"
      >
        <span />
        <span />
        <span />
      </button>
      {open && (
        <div className="hamburger-dropdown">
          <button
            className="hamburger-item"
            onClick={() => {
              setOpen(false);
              onSelectPapelera();
            }}
          >
            Papelera
          </button>
        </div>
      )}
    </div>
  );
}
