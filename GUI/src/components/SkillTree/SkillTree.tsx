import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { TareaRelacionada } from '../../types/task';
import { SkillNode } from './SkillNode';
import './skill-tree.css';

interface SkillTreeProps {
  projects: Map<string, TareaRelacionada[]>;
  onToggleComplete: (filename: string) => void;
  onEditTask: (filename: string) => void;
  zoom: number;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const NODE_W = 260;
const NODE_H = 120;
const COL_GAP = 60;
const ROW_GAP = 20;

function computeLayout(
  projects: Map<string, TareaRelacionada[]>,
  _tasksMap: Map<string, TareaRelacionada>,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();

  let colX = 40;
  projects.forEach((tareas) => {
    let rowY = 40;
    tareas.forEach((tarea) => {
      positions.set(tarea.id, {
        id: tarea.id,
        x: colX,
        y: rowY,
        width: NODE_W,
        height: NODE_H,
      });
      rowY += NODE_H + ROW_GAP;
    });
    colX += NODE_W + COL_GAP;
  });

  return positions;
}

export function SkillTree({ projects, onToggleComplete, onEditTask, zoom }: SkillTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; lastX: number; lastY: number; moved: boolean } | null>(null);
  const wasDraggedRef = useRef(false);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const tasksMap = useMemo(() => {
    const map = new Map<string, TareaRelacionada>();
    projects.forEach((tareas) => {
      tareas.forEach((tarea) => map.set(tarea.id, tarea));
    });
    return map;
  }, [projects]);

  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(() => {
    return computeLayout(projects, tasksMap);
  });

  useEffect(() => {
    setNodePositions(prev => {
      const next = new Map(prev);
      const layout = computeLayout(projects, tasksMap);
      layout.forEach((pos, id) => {
        if (!next.has(id)) {
          next.set(id, pos);
        }
      });
      return next;
    });
  }, [projects, tasksMap]);

  useEffect(() => {
    const newPositions = new Map(nodePositions);
    let changed = false;

    nodePositions.forEach((pos, id) => {
      const el = document.getElementById(`node-${id}`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const actualW = rect.width / zoom;
      const actualH = rect.height / zoom;
      if (Math.abs(actualW - pos.width) > 3 || Math.abs(actualH - pos.height) > 3) {
        newPositions.set(id, { ...pos, width: actualW, height: actualH });
        changed = true;
      }
    });

    projects.forEach((tareas) => {
      let rowY: number | null = null;
      tareas.forEach((tarea) => {
        const pos = newPositions.get(tarea.id);
        if (!pos) return;
        if (rowY === null) {
          rowY = pos.y;
        } else {
          if (pos.y !== rowY) changed = true;
          newPositions.set(tarea.id, { ...pos, y: rowY });
        }
        rowY! += pos.height + ROW_GAP;
      });
    });

    if (changed) {
      setNodePositions(newPositions);
    }
  }, [zoom, projects, nodePositions]);

  const projectsArray = useMemo(() => Array.from(projects.entries()), [projects]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const pos = nodePositions.get(taskId);
    if (!pos) return;

    dragRef.current = {
      id: taskId,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;

      const dx = (e.clientX - d.lastX) / zoomRef.current;
      const dy = (e.clientY - d.lastY) / zoomRef.current;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        d.moved = true;
        wasDraggedRef.current = true;
      }
      d.lastX = e.clientX;
      d.lastY = e.clientY;

      setNodePositions(prev => {
        const p = prev.get(d.id);
        if (!p) return prev;
        const next = new Map(prev);
        next.set(d.id, { ...p, x: p.x + dx, y: p.y + dy });
        return next;
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      dragRef.current = null;
      setTimeout(() => { wasDraggedRef.current = false; }, 0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [nodePositions]);

  return (
    <div className="skill-tree" ref={containerRef}>
      <div className="skill-tree-content">

        {projectsArray.map(([proyecto, tareas]) => (
          <div key={proyecto}>
            {tareas.map((tarea) => {
              const pos = nodePositions.get(tarea.id);
              if (!pos) return null;
              return (
                <div
                  key={tarea.id}
                  id={`node-${tarea.id}`}
                  className="skill-node-wrapper"
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    width: pos.width,
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, tarea.id)}
                >
                  <SkillNode
                    tarea={tarea}
                    tasksMap={tasksMap}
                    onToggleComplete={onToggleComplete}
                    onEdit={onEditTask}
                    wasDraggedRef={wasDraggedRef}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
