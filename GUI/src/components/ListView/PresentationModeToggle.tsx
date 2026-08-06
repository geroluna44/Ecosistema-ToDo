interface PresentationModeToggleProps {
  mode: 'tabla' | 'mosaico';
  onChange: (mode: 'tabla' | 'mosaico') => void;
}

export function PresentationModeToggle({ mode, onChange }: PresentationModeToggleProps) {
  const nextMode = mode === 'tabla' ? 'mosaico' : 'tabla';

  return (
    <button
      className="list-view-presentation-toggle"
      onClick={() => onChange(nextMode)}
      title={mode === 'tabla' ? 'Cambiar a modo mosaico' : 'Cambiar a modo tabla'}
      aria-label={mode === 'tabla' ? 'Cambiar a modo mosaico' : 'Cambiar a modo tabla'}
    >
      <span aria-hidden="true">{mode === 'tabla' ? '▦' : '☷'}</span>
      <span>{mode === 'tabla' ? 'Mosaico' : 'Tabla'}</span>
    </button>
  );
}
