import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { TareaRelacionada } from '../../types/task';
import { SkillNode } from './SkillNode';
import './skill-tree.css';

interface SkillTreeProps {
  projects: Map<string, TareaRelacionada[]>;
  onToggleComplete: (filename: string) => void;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Connection {
  from: NodePosition;
  to: NodePosition;
}

function buildConnections(connections: Connection[]): string[] {
  return connections.map(({ from, to }) => {
    const startX = from.x + from.width / 2;
    const startY = from.y + from.height;
    const endX = to.x + to.width / 2;
    const endY = to.y;
    
    const midY = (startY + endY) / 2;
    
    return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
  });
}

function measureNode(id: string, containerRect: DOMRect): NodePosition | null {
  const el = document.getElementById(`node-${id}`);
  if (!el) return null;
  
  const rect = el.getBoundingClientRect();
  return {
    id,
    x: rect.left - containerRect.left,
    y: rect.top - containerRect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function SkillTree({ projects, onToggleComplete }: SkillTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map());

  const tasksMap = useMemo(() => {
    const map = new Map<string, TareaRelacionada>();
    projects.forEach((tareas) => {
      tareas.forEach((tarea) => map.set(tarea.id, tarea));
    });
    return map;
  }, [projects]);

  const measureNodes = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions = new Map<string, NodePosition>();
    projects.forEach((tareas) => {
      tareas.forEach((tarea) => {
        const pos = measureNode(tarea.id, containerRect);
        if (pos) newPositions.set(tarea.id, pos);
      });
    });
    setPositions(newPositions);
  }, [projects]);

  useEffect(() => {
    const timeoutId = requestAnimationFrame(measureNodes);
    return () => cancelAnimationFrame(timeoutId);
  }, [measureNodes]);

  const connections = useMemo(() => {
    const conns: Connection[] = [];
    projects.forEach((tareas) => {
      tareas.forEach((tarea) => {
        if (tarea['Tarea Padre']) {
          const parentPos = positions.get(tarea['Tarea Padre']);
          const childPos = positions.get(tarea.id);
          if (parentPos && childPos) {
            conns.push({ from: parentPos, to: childPos });
          }
        }
      });
    });
    return buildConnections(conns);
  }, [projects, positions]);

  const projectsArray = useMemo(() => Array.from(projects.entries()), [projects]);

  return (
    <div className="skill-tree" ref={containerRef}>
      <div className="skill-tree-content">
        <svg 
          className="skill-connections"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
        >
          {connections.map((path, i) => (
            <path key={i} d={path} />
          ))}
        </svg>
        
        {projectsArray.map(([proyecto, tareas]) => (
          <div key={proyecto} className="skill-project">
            <div className="skill-project-title">{proyecto}</div>
            {tareas.map((tarea) => (
              <div key={tarea.id} className="skill-nodes-row">
                <div id={`node-${tarea.id}`}>
                  <SkillNode
                    tarea={tarea}
                    tasksMap={tasksMap}
                    onToggleComplete={onToggleComplete}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}