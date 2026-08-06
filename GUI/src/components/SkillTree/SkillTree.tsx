import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { TareaRelacionada } from '../../types/task';
import { SkillNode } from './SkillNode';
import { ConnectorOverlay } from './ConnectorOverlay';
import './skill-tree.css';

export const GRID_SIZE = 40;

interface SkillTreeProps {
  projects: Map<string, TareaRelacionada[]>;
  onToggleComplete: (filename: string) => void;
  onEditTask: (filename: string) => void;
  onTrashTask: (filename: string) => void;
  onTrashProject: (proyecto: string) => void;
  onConnect?: (parentId: string, childId: string) => void;
  onDisconnect?: (childId: string, parentId: string) => void;
  zoom: number;
  layoutVersion: number;
  modifyingNodeId: string | null;
  onModifyConnectionsChange: (nodeId: string | null) => void;
  positionScope: 'normal' | 'debug';
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const NODE_W = 260;
const NODE_H = 120;
const COL_GAP = 80;
const ROW_GAP = 60;
const SIBLING_GAP = 50;
const POSITION_STORAGE_PREFIX = 'skillTreePositions:';

function checkCollision(
  rect: { x: number; y: number; width: number; height: number },
  allPositions: Map<string, NodePosition>,
  excludeId: string
): string | null {
  for (const [id, other] of allPositions) {
    if (id === excludeId) continue;
    if (
      rect.x < other.x + other.width &&
      rect.x + rect.width > other.x &&
      rect.y < other.y + other.height &&
      rect.y + rect.height > other.y
    ) {
      return id;
    }
  }
  return null;
}

function snapToGrid(value: number): number {
  return Math.max(0, Math.round(value / GRID_SIZE) * GRID_SIZE);
}

function readStoredPositions(scope: 'normal' | 'debug'): Map<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(`${POSITION_STORAGE_PREFIX}${scope}`);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, { x?: number; y?: number }>;
    const positions = new Map<string, { x: number; y: number }>();
    Object.entries(parsed).forEach(([id, position]) => {
      if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) {
        positions.set(id, { x: snapToGrid(position.x!), y: snapToGrid(position.y!) });
      }
    });
    return positions;
  } catch {
    return new Map();
  }
}

function persistPositions(scope: 'normal' | 'debug', positions: Map<string, NodePosition>): void {
  try {
    const serializable: Record<string, { x: number; y: number }> = {};
    positions.forEach((position, id) => {
      serializable[id] = { x: position.x, y: position.y };
    });
    localStorage.setItem(`${POSITION_STORAGE_PREFIX}${scope}`, JSON.stringify(serializable));
  } catch {}
}

function computeLayout(
  projects: Map<string, TareaRelacionada[]>,
  tasksMap: Map<string, TareaRelacionada>,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();

  const childrenMap = new Map<string, string[]>();
  tasksMap.forEach((task) => {
    const parents = task['Tarea Padre'] || [];
    parents.forEach(parentId => {
      const list = childrenMap.get(parentId) || [];
    list.push(task.id);
      childrenMap.set(parentId, list);
    });
  });
  childrenMap.forEach(children => children.sort((a, b) => a.localeCompare(b)));

  const widthCache = new Map<string, number>();
  const subtreeWidth = (nodeId: string): number => {
    const cached = widthCache.get(nodeId);
    if (cached !== undefined) return cached;
    return subtreeWidthWithPath(nodeId, new Set());
  };

  const subtreeWidthWithPath = (nodeId: string, visiting: Set<string>): number => {
    const cached = widthCache.get(nodeId);
    if (cached !== undefined) return cached;
    if (visiting.has(nodeId)) return NODE_W;

    const nextVisiting = new Set(visiting);
    nextVisiting.add(nodeId);
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) {
      widthCache.set(nodeId, NODE_W);
      return NODE_W;
    }
    const total = children.reduce((sum, childId, i) => {
      return sum + subtreeWidthWithPath(childId, nextVisiting) + (i < children.length - 1 ? SIBLING_GAP : 0);
    }, 0);
    const width = Math.max(NODE_W, total);
    widthCache.set(nodeId, width);
    return width;
  };

  const layoutSubtree = (nodeId: string, x: number, y: number, visiting = new Set<string>()): void => {
    if (positions.has(nodeId) || visiting.has(nodeId)) return;
    const nextVisiting = new Set(visiting);
    nextVisiting.add(nodeId);
    const children = childrenMap.get(nodeId) || [];
    const width = subtreeWidth(nodeId);

    positions.set(nodeId, {
      id: nodeId,
      x: snapToGrid(x + width / 2 - NODE_W / 2),
      y: snapToGrid(y),
      width: NODE_W,
      height: NODE_H,
    });

    if (children.length > 0) {
      const totalChildrenWidth = children.reduce((sum, childId, i) => {
        return sum + subtreeWidth(childId) + (i < children.length - 1 ? SIBLING_GAP : 0);
      }, 0);
      let childX = x + (width - totalChildrenWidth) / 2;

      children.forEach((childId) => {
        const childWidth = subtreeWidth(childId);
        layoutSubtree(childId, childX, y + NODE_H + ROW_GAP, nextVisiting);
        childX += childWidth + SIBLING_GAP;
      });
    }
  };

  const findFreePosition = (x: number, y: number): { x: number; y: number } => {
    let row = 0;
    while (row < 10000) {
      const candidate = {
        x: snapToGrid(x),
        y: snapToGrid(y + row * (NODE_H + ROW_GAP)),
        width: NODE_W,
        height: NODE_H,
      };
      if (!checkCollision(candidate, positions, '')) return { x: candidate.x, y: candidate.y };
      row += 1;
    }
    return { x: snapToGrid(x), y: snapToGrid(y) };
  };

  let colX = 40;
  const sortedProjects = Array.from(projects.entries()).sort(([a], [b]) => a.localeCompare(b));
  sortedProjects.forEach(([, tareas]) => {
    const sortedTasks = [...tareas].sort((a, b) => a.Nombre.localeCompare(b.Nombre) || a.id.localeCompare(b.id));
    const roots = sortedTasks.filter((t) => t.esRaiz);
    const nonRoots = sortedTasks.filter((t) => !t.esRaiz);

    let projectX = colX;
    let projectWidth = 0;
    roots.forEach((root) => {
      layoutSubtree(root.id, projectX, 40);
      const w = subtreeWidth(root.id);
      projectX += w + SIBLING_GAP;
    });
    projectWidth = Math.max(NODE_W, projectX - colX - (roots.length > 0 ? SIBLING_GAP : 0));

    nonRoots.forEach((tarea) => {
      if (!positions.has(tarea.id)) {
        const fallback = findFreePosition(colX, 40);
        positions.set(tarea.id, {
          id: tarea.id,
          x: fallback.x,
          y: fallback.y,
          width: NODE_W,
          height: NODE_H,
        });
      }
    });

    colX += projectWidth + COL_GAP;
  });

  return positions;
}

export function SkillTree({ projects, onToggleComplete, onEditTask, onTrashTask, onTrashProject, onConnect, onDisconnect, zoom, layoutVersion, modifyingNodeId, onModifyConnectionsChange, positionScope }: SkillTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    moved: boolean;
  } | null>(null);
  const wasDraggedRef = useRef(false);
  const zoomRef = useRef(zoom);
  const hydratedScopeRef = useRef<string | null>(null);
  const hydratingPositionsRef = useRef(false);
  const previousLayoutVersionRef = useRef(layoutVersion);
  const [stickyNodeId, setStickyNodeId] = useState<string | null>(null);
  zoomRef.current = zoom;

  const tasksMap = useMemo(() => {
    const map = new Map<string, TareaRelacionada>();
    projects.forEach((tareas) => {
      tareas.forEach((tarea) => map.set(tarea.id, tarea));
    });
    return map;
  }, [projects]);

  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(() => {
    const layout = computeLayout(projects, tasksMap);
    const stored = readStoredPositions(positionScope);
    stored.forEach((saved, id) => {
      const position = layout.get(id);
      if (position) {
        layout.set(id, { ...position, x: saved.x, y: saved.y });
      }
    });
    return layout;
  });

  useEffect(() => {
    if (tasksMap.size === 0) return;

    const layout = computeLayout(projects, tasksMap);
    const shouldHydrate = hydratedScopeRef.current !== positionScope;
    const stored = shouldHydrate ? readStoredPositions(positionScope) : new Map();
    hydratingPositionsRef.current = shouldHydrate;

    setNodePositions(prev => {
      const next = new Map<string, NodePosition>();
      layout.forEach((pos, id) => {
        const saved = stored.get(id);
        if (saved) {
          next.set(id, { ...pos, x: saved.x, y: saved.y });
        } else {
          next.set(id, prev.get(id) || pos);
        }
      });
      return next;
    });

    hydratedScopeRef.current = positionScope;
  }, [projects, tasksMap, positionScope]);

  useEffect(() => {
    if (tasksMap.size === 0 || hydratedScopeRef.current !== positionScope) {
      return;
    }
    if (hydratingPositionsRef.current) {
      hydratingPositionsRef.current = false;
      return;
    }
    persistPositions(positionScope, nodePositions);
  }, [nodePositions, positionScope, tasksMap.size]);

  useEffect(() => {
    const newPositions = new Map(nodePositions);
    let changed = false;

    nodePositions.forEach((pos, id) => {
      const el = document.getElementById(`node-${id}`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const actualW = rect.width / zoomRef.current;
      const actualH = rect.height / zoomRef.current;
      if (Math.abs(actualW - pos.width) > 3 || Math.abs(actualH - pos.height) > 3) {
        newPositions.set(id, { ...pos, width: actualW, height: actualH });
        changed = true;
      }
    });

    if (changed) {
      setNodePositions(newPositions);
    }
  }, [projects, nodePositions]);

  useEffect(() => {
    if (previousLayoutVersionRef.current === layoutVersion) return;
    previousLayoutVersionRef.current = layoutVersion;
    setNodePositions(computeLayout(projects, tasksMap));
  }, [layoutVersion, projects, tasksMap]);

  const projectsArray = useMemo(() => Array.from(projects.entries()), [projects]);

  const contentBounds = useMemo(() => {
    let maxX = 0, maxY = 0;
    nodePositions.forEach(p => {
      maxX = Math.max(maxX, p.x + p.width);
      maxY = Math.max(maxY, p.y + p.height);
    });
    return { width: Math.max(maxX + 40, 100), height: Math.max(maxY + 40, 100) };
  }, [nodePositions]);

  const handleModifyConnections = useCallback((id: string) => {
    setStickyNodeId(null);
    onModifyConnectionsChange(modifyingNodeId === id ? null : id);
  }, [modifyingNodeId, onModifyConnectionsChange]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const pos = nodePositions.get(taskId);
    if (!pos) return;

    dragRef.current = {
      id: taskId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos.x,
      baseY: pos.y,
      moved: false,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;

      const dx = (e.clientX - d.startX) / zoomRef.current;
      const dy = (e.clientY - d.startY) / zoomRef.current;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        d.moved = true;
        wasDraggedRef.current = true;
      }
      setNodePositions(prev => {
        const p = prev.get(d.id);
        if (!p) return prev;

        const newX = snapToGrid(d.baseX + (e.clientX - d.startX) / zoomRef.current);
        const newY = snapToGrid(d.baseY + (e.clientY - d.startY) / zoomRef.current);
        const next = new Map(prev);

        const testFull = { x: newX, y: newY, width: p.width, height: p.height };
        if (!checkCollision(testFull, prev, d.id)) {
          next.set(d.id, { ...p, x: newX, y: newY });
          return next;
        }

        const testX = { x: newX, y: p.y, width: p.width, height: p.height };
        if (!checkCollision(testX, prev, d.id)) {
          next.set(d.id, { ...p, x: newX });
          return next;
        }

        const testY = { x: p.x, y: newY, width: p.width, height: p.height };
        if (!checkCollision(testY, prev, d.id)) {
          next.set(d.id, { ...p, y: newY });
          return next;
        }

        return prev;
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
      <div className="skill-tree-content" style={{ width: contentBounds.width, height: contentBounds.height }}>

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
                    onTrash={onTrashTask}
                    onTrashProject={onTrashProject}
                    isStickyOpen={stickyNodeId === tarea.id}
                    onToggleSticky={(id) => setStickyNodeId(prev => prev === id ? null : id)}
                    onModifyConnections={handleModifyConnections}
                    wasDraggedRef={wasDraggedRef}
                  />
                </div>
              );
            })}
          </div>
        ))}
        <ConnectorOverlay nodePositions={nodePositions} tasksMap={tasksMap} onConnect={onConnect} onDisconnect={onDisconnect} ghostNodeId={modifyingNodeId} onModifyConnectionsClick={onModifyConnectionsChange} />
      </div>
    </div>
  );
}
