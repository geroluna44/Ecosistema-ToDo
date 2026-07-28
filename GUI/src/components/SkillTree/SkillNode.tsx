import { useState, useMemo, useRef, useEffect, type RefObject } from 'react';
import { TareaRelacionada } from '../../types/task';
import './skill-node.css';

interface SkillNodeProps {
  tarea: TareaRelacionada;
  tasksMap: Map<string, TareaRelacionada>;
  onToggleComplete: (filename: string) => void;
  onEdit: (filename: string) => void;
  wasDraggedRef?: RefObject<boolean>;
}

function formatDeadline(deadline: number | undefined): string {
  if (!deadline) return 'Sin fecha';
  const str = deadline.toString();
  const month = str.slice(4, 6);
  const day = str.slice(6, 8);
  return `${day}/${month}`;
}

function formatTime(minutes: number | undefined): string {
  if (!minutes) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function SkillNode({ tarea, tasksMap, onToggleComplete, onEdit, wasDraggedRef }: SkillNodeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [stickyInfo, setStickyInfo] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!stickyInfo) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (stickyRef.current && !stickyRef.current.contains(e.target as Node)) {
        setStickyInfo(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStickyInfo(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [stickyInfo]);

  const handleClick = () => {
    if (wasDraggedRef?.current) return;
    if (!isBlocked) {
      onToggleComplete(tarea.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setStickyInfo(prev => !prev);
  };

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleStickyClick = () => {
    onEdit(tarea.id);
    setStickyInfo(false);
  };

  const nodeClasses = useMemo(() => [
    'skill-node',
    status === 'blocked' ? 'blocked' : '',
    tarea.completado ? 'completed' : '',
  ].filter(Boolean).join(' '), [status, tarea.completado]);

  return (
    <div
      className="skill-node-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
    >
      <div
        className={nodeClasses}
        onClick={handleClick}
      >
        {isPosterged && <div className="skill-node-posterged" title="Tarea postergada" />}

        <div className="skill-node-header">
          <div className={`skill-node-indicator ${status}`} />
          <div className="skill-node-title">{tarea.Nombre}</div>
        </div>

        <div className="skill-node-project">{tarea.Proyecto || 'Sin proyecto'}</div>

        <div className="skill-node-desc">{tarea.Descripcion}</div>

        <div className="skill-node-meta">
          <span className="skill-node-time">⏱ {formatTime(tarea['Rango de tiempo'])}</span>
          <span className="skill-node-deadline">📅 {formatDeadline(tarea.Deadline)}</span>
          <span className={`skill-node-urgency urgency-${(tarea.Urgencia || 'A').toLowerCase()}`}>
            {tarea.Urgencia || '?'}
          </span>
        </div>
      </div>

      {showTooltip && (
        <div className="tooltip">
          <div className="tooltip-title">{tarea.Nombre}</div>
          <div className="tooltip-project">{tarea.Proyecto}</div>
          <div className="tooltip-desc">{tarea.Descripcion}</div>
          <div className="tooltip-meta">
            <span className="tooltip-badge">⏱ {formatTime(tarea['Rango de tiempo'])}</span>
            <span className="tooltip-badge">📅 {formatDeadline(tarea.Deadline)}</span>
            <span className={`tooltip-badge urgency-${(tarea.Urgencia || 'A').toLowerCase()}`}>
              Urgencia {tarea.Urgencia || '?'}
            </span>
            {tarea['Primer paso'] && (
              <span className="tooltip-badge">→ {tarea['Primer paso']}</span>
            )}
          </div>
        </div>
      )}

      {stickyInfo && (
        <div
          ref={stickyRef}
          className="sticky-info-card"
          onClick={handleStickyClick}
        >
          <div className="sticky-info-title">{tarea.Nombre}</div>
          <div className="sticky-info-project">{tarea.Proyecto}</div>
          <div className="sticky-info-desc">{tarea.Descripcion}</div>
          <div className="sticky-info-meta">
            <span className="sticky-info-badge">⏱ {formatTime(tarea['Rango de tiempo'])}</span>
            <span className="sticky-info-badge">📅 {formatDeadline(tarea.Deadline)}</span>
            <span className={`sticky-info-badge urgency-${(tarea.Urgencia || 'A').toLowerCase()}`}>
              Urgencia {tarea.Urgencia || '?'}
            </span>
            {tarea['Primer paso'] && (
              <span className="sticky-info-badge">→ {tarea['Primer paso']}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
