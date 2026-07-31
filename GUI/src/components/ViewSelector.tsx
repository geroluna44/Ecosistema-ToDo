import { useState } from 'react';
import { Vista } from '../types/task';

interface ViewSelectorProps {
  vistaActiva: Vista;
  onVistaChange: (vista: Vista) => void;
}

export function ViewSelector({ vistaActiva, onVistaChange }: ViewSelectorProps) {
  const [minimized, setMinimized] = useState(false);

  return (
    <div className={`view-selector ${minimized ? 'minimized' : ''}`}>
      <div className="view-selector-icons">
        <button
          className={`view-selector-btn ${vistaActiva === 'lista' ? 'active' : ''}`}
          onClick={() => onVistaChange('lista')}
          title="Lista"
        >
          📋
        </button>
        <button
          className={`view-selector-btn ${vistaActiva === 'arbol' ? 'active' : ''}`}
          onClick={() => onVistaChange('arbol')}
          title="Árbol de habilidades"
        >
          🌳
        </button>
        <button
          className={`view-selector-btn ${vistaActiva === 'calendario' ? 'active' : ''}`}
          onClick={() => onVistaChange('calendario')}
          title="Calendario"
        >
          📅
        </button>
        <button
          className={`view-selector-btn ${vistaActiva === 'nodos' ? 'active' : ''}`}
          onClick={() => onVistaChange('nodos')}
          title="Vista de nodos"
        >
          🔗
        </button>
      </div>
      <button
        className="view-selector-toggle"
        onClick={() => setMinimized(!minimized)}
        title={minimized ? 'Mostrar selector' : 'Ocultar selector'}
      >
        {minimized ? '▶' : '◀'}
      </button>
    </div>
  );
}