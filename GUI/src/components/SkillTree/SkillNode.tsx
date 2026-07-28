import { useState, useMemo } from 'react';
import { TareaRelacionada } from '../../types/task';
import './skill-node.css';

interface SkillNodeProps {
  tarea: TareaRelacionada;
  tasksMap: Map<string, TareaRelacionada>;
  onToggleComplete: (filename: string) => void;
}

function formatDeadline(deadline: number): string {
  const str = deadline.toString();
  const month = str.slice(4, 6);
  const day = str.slice(6, 8);
  return `${day}/${month}`;
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function SkillNode({ tarea, tasksMap, onToggleComplete }: SkillNodeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const { isBlocked, isPosterged, status } = useMemo(() => {
    const parentTask = tarea['Tarea Padre'] ? tasksMap.get(tarea['Tarea Padre']) : null;
    const blocked = parentTask && !parentTask.completado;
    const postponed = tarea.Postergaciones > 0;
    
    let nodeStatus: 'available' | 'blocked' | 'completed' | 'postponed' = 'available';
    if (tarea.completado) nodeStatus = 'completed';
    else if (blocked) nodeStatus = 'blocked';
    else if (postponed) nodeStatus = 'postponed';
    
    return { isBlocked: blocked, isPosterged: postponed, status: nodeStatus };
  }, [tarea, tasksMap]);

  const handleClick = () => {
    if (!isBlocked) {
      onToggleComplete(tarea.id);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = rect.right + 10;
    let y = rect.top;
    
    if (x + 300 > viewportWidth) {
      x = rect.left - 310;
    }
    if (y + 200 > viewportHeight) {
      y = viewportHeight - 210;
    }
    
    setTooltipPos({ x, y });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const nodeClasses = useMemo(() => [
    'skill-node',
    status === 'blocked' ? 'blocked' : '',
    tarea.completado ? 'completed' : '',
  ].filter(Boolean).join(' '), [status, tarea.completado]);

  return (
    <>
      <div
        className={nodeClasses}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isPosterged && <div className="skill-node-posterged" title="Tarea postergada" />}
        
        <div className="skill-node-header">
          <div className={`skill-node-indicator ${status}`} />
          <div className="skill-node-title">{tarea.Nombre}</div>
        </div>
        
        <div className="skill-node-project">{tarea.Proyecto}</div>
        
        <div className="skill-node-meta">
          <span className="skill-node-time">⏱ {formatTime(tarea['Rango de tiempo'])}</span>
          <span className="skill-node-deadline">📅 {formatDeadline(tarea.Deadline)}</span>
          <span className={`skill-node-urgency urgency-${tarea.Urgencia.toLowerCase()}`}>
            {tarea.Urgencia}
          </span>
        </div>
      </div>

      {showTooltip && (
        <div
          className="tooltip"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
          }}
        >
          <div className="tooltip-title">{tarea.Nombre}</div>
          <div className="tooltip-project">{tarea.Proyecto}</div>
          <div className="tooltip-desc">{tarea.Descripcion}</div>
          <div className="tooltip-meta">
            <span className="tooltip-badge">⏱ {formatTime(tarea['Rango de tiempo'])}</span>
            <span className="tooltip-badge">📅 {formatDeadline(tarea.Deadline)}</span>
            <span className={`tooltip-badge urgency-${tarea.Urgencia.toLowerCase()}`}>
              Urgencia {tarea.Urgencia}
            </span>
            {tarea['Primer paso'] && (
              <span className="tooltip-badge">→ {tarea['Primer paso']}</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}