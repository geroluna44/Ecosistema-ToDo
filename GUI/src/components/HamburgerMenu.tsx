import { useState, useEffect, useRef } from 'react';
import '../styles/hamburger-menu.css';

interface HamburgerMenuProps {
  onSelectPapelera: () => void;
  debugMode: boolean;
  onToggleDebug: () => void;
}

export function HamburgerMenu({ onSelectPapelera, debugMode, onToggleDebug }: HamburgerMenuProps) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem('hamburgerMenuOpen') === 'true';
    } catch {
      return false;
    }
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('hamburgerMenuOpen', String(open));
    } catch {}
  }, [open]);

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
          <button
            className={`hamburger-item ${debugMode ? 'active' : ''}`}
            onClick={() => {
              onToggleDebug();
            }}
          >
            {debugMode ? '● Modo Debug' : '○ Modo Debug'}
          </button>
        </div>
      )}
    </div>
  );
}
