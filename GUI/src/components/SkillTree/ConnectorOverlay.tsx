import { useMemo, useRef, useCallback, useState } from 'react';
import { TareaRelacionada } from '../../types/task';

interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ConnectorOverlayProps {
  nodePositions: Map<string, NodePosition>;
  tasksMap: Map<string, TareaRelacionada>;
  onConnect?: (parentId: string, childId: string) => void;
  onDisconnect?: (childId: string, parentId: string) => void;
  ghostNodeId?: string | null;
  onModifyConnectionsClick: (nodeId: string) => void;
}

type Edge = 'top' | 'right' | 'bottom' | 'left';

interface Connector {
  type: 'input' | 'output';
  edge: Edge;
  cx: number;
  cy: number;
  status: string;
  nodeId: string;
  relatedNodeId?: string;
}

interface ConnectorLine {
  path: string;
}

function getStatus(task: TareaRelacionada, tasksMap: Map<string, TareaRelacionada>): string {
  if (task.completado) return 'completed';
  const parents = task['Tarea Padre'] || [];
  const parentTasks = parents.map(p => tasksMap.get(p)).filter(p => p !== undefined);
  if (parentTasks.some(p => !p!.completado)) return 'blocked';
  if (task.Postergaciones > 0) return 'postponed';
  return 'available';
}

function determineEdge(
  fromCenterX: number, fromCenterY: number,
  toCenterX: number, toCenterY: number
): Edge {
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'bottom' : 'top';
}

function getTrianglePoints(cx: number, cy: number, edge: Edge): string {
  switch (edge) {
    case 'top': return `${cx},${cy - 8} ${cx - 6},${cy} ${cx + 6},${cy}`;
    case 'bottom': return `${cx},${cy + 8} ${cx - 6},${cy} ${cx + 6},${cy}`;
    case 'left': return `${cx - 8},${cy} ${cx},${cy - 6} ${cx},${cy + 6}`;
    case 'right': return `${cx + 8},${cy} ${cx},${cy - 6} ${cx},${cy + 6}`;
    default: return '';
  }
}

function computeOrthogonalPath(
  sx: number, sy: number, sEdge: Edge,
  ex: number, ey: number, eEdge: Edge
): string {
  const OFFSET = 25;

  let startX = sx, startY = sy;
  let endX = ex, endY = ey;

  switch (sEdge) {
    case 'top': startY -= OFFSET; break;
    case 'bottom': startY += OFFSET; break;
    case 'left': startX -= OFFSET; break;
    case 'right': startX += OFFSET; break;
  }
  switch (eEdge) {
    case 'top': endY -= OFFSET; break;
    case 'bottom': endY += OFFSET; break;
    case 'left': endX -= OFFSET; break;
    case 'right': endX += OFFSET; break;
  }

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  if (Math.abs(startX - endX) > Math.abs(startY - endY)) {
    return `M ${sx},${sy} L ${startX},${startY} L ${startX},${midY} L ${endX},${midY} L ${endX},${endY} L ${ex},${ey}`;
  }
  return `M ${sx},${sy} L ${startX},${startY} L ${midX},${startY} L ${midX},${endY} L ${endX},${endY} L ${ex},${ey}`;
}

export function ConnectorOverlay({ nodePositions, tasksMap, onConnect, onDisconnect, ghostNodeId, onModifyConnectionsClick }: ConnectorOverlayProps) {
  const [dragState, setDragState] = useState<{
    sourceNodeId: string;
    cx: number;
    cy: number;
    edge: Edge;
    currentX: number;
    currentY: number;
    targetNodeId: string | null;
  } | null>(null);

  const dragStateRef = useRef<typeof dragState>(null);
  dragStateRef.current = dragState;

  const [disconnectDrag, setDisconnectDrag] = useState<{
    sourceNodeId: string;
    parentNodeId: string;
    cx: number;
    cy: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    moved: boolean;
  } | null>(null);

  const disconnectDragRef = useRef<typeof disconnectDrag>(null);
  disconnectDragRef.current = disconnectDrag;

  const { connectors, lines } = useMemo(() => {
    const connectors: Connector[] = [];
    const lines: ConnectorLine[] = [];

    const childrenMap = new Map<string, string[]>();
    tasksMap.forEach((task) => {
      const parents = task['Tarea Padre'] || [];
      parents.forEach(parentId => {
        const list = childrenMap.get(parentId) || [];
        list.push(task.id);
        childrenMap.set(parentId, list);
      });
    });

    const pairPositions = new Map<string, {
      sx: number; sy: number; sEdge: Edge;
      ex: number; ey: number; eEdge: Edge;
    }>();

    nodePositions.forEach((pos, nodeId) => {
      const task = tasksMap.get(nodeId);
      if (!task) return;

      const nodeCenterX = pos.x + pos.width / 2;
      const nodeCenterY = pos.y + pos.height / 2;
      const status = getStatus(task, tasksMap);

      interface PendingConn {
        type: 'input' | 'output';
        status: string;
        pairKey: string;
        relatedNodeId: string;
      }

      const byEdge = new Map<Edge, PendingConn[]>();

      const parents = task['Tarea Padre'] || [];
      parents.forEach(parentId => {
        const parentPos = nodePositions.get(parentId);
        if (parentPos) {
          const edge = determineEdge(
            nodeCenterX, nodeCenterY,
            parentPos.x + parentPos.width / 2,
            parentPos.y + parentPos.height / 2
          );
          const list = byEdge.get(edge) || [];
          list.push({ type: 'input', status, pairKey: `${parentId}->${nodeId}`, relatedNodeId: parentId });
          byEdge.set(edge, list);
        }
      });

      const children = childrenMap.get(nodeId) || [];
      children.forEach((childId) => {
        const childPos = nodePositions.get(childId);
        if (!childPos) return;
        const edge = determineEdge(
          nodeCenterX, nodeCenterY,
          childPos.x + childPos.width / 2,
          childPos.y + childPos.height / 2
        );
        const list = byEdge.get(edge) || [];
        list.push({ type: 'output', status, pairKey: `${nodeId}->${childId}`, relatedNodeId: childId });
        byEdge.set(edge, list);
      });

      byEdge.forEach((pending, edge) => {
        const total = pending.length;
        pending.forEach((p, i) => {
          let cx: number;
          let cy: number;
          if (edge === 'top') {
            cx = pos.x + (pos.width / (total + 1)) * (i + 1);
            cy = pos.y;
          } else if (edge === 'bottom') {
            cx = pos.x + (pos.width / (total + 1)) * (i + 1);
            cy = pos.y + pos.height;
          } else if (edge === 'left') {
            cx = pos.x;
            cy = pos.y + (pos.height / (total + 1)) * (i + 1);
          } else {
            cx = pos.x + pos.width;
            cy = pos.y + (pos.height / (total + 1)) * (i + 1);
          }

          connectors.push({ type: p.type, edge, cx, cy, status: p.status, nodeId, relatedNodeId: p.relatedNodeId });

          if (p.type === 'input') {
            let entry = pairPositions.get(p.pairKey);
            if (!entry) {
              entry = { sx: 0, sy: 0, sEdge: 'top', ex: 0, ey: 0, eEdge: 'top' };
              pairPositions.set(p.pairKey, entry);
            }
            entry.ex = cx;
            entry.ey = cy;
            entry.eEdge = edge;
          } else {
            let entry = pairPositions.get(p.pairKey);
            if (!entry) {
              entry = { sx: 0, sy: 0, sEdge: 'top', ex: 0, ey: 0, eEdge: 'top' };
              pairPositions.set(p.pairKey, entry);
            }
            entry.sx = cx;
            entry.sy = cy;
            entry.sEdge = edge;
          }
        });
      });
    });

    pairPositions.forEach((entry) => {
      if (!entry.sEdge || !entry.eEdge) return;
      if (entry.sx === 0 && entry.sy === 0 && entry.ex === 0 && entry.ey === 0) return;
      lines.push({
        path: computeOrthogonalPath(entry.sx, entry.sy, entry.sEdge, entry.ex, entry.ey, entry.eEdge),
      });
    });

    return { connectors, lines };
  }, [nodePositions, tasksMap]);

  const handleInputPointerDown = useCallback((e: React.PointerEvent, conn: Connector) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);

    setDisconnectDrag({
      sourceNodeId: conn.nodeId,
      parentNodeId: conn.relatedNodeId || '',
      cx: conn.cx,
      cy: conn.cy,
      startX: e.clientX,
      startY: e.clientY,
      currentX: conn.cx,
      currentY: conn.cy,
      moved: false,
    });
  }, []);

  const handleOutputPointerDown = useCallback((e: React.PointerEvent, conn: Connector) => {
    e.stopPropagation();
    onModifyConnectionsClick(conn.nodeId);
  }, [onModifyConnectionsClick]);

  const handlePointerDown = useCallback((e: React.PointerEvent, conn: Connector) => {
    if (!onConnect) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);

    setDragState({
      sourceNodeId: conn.nodeId,
      cx: conn.cx,
      cy: conn.cy,
      edge: conn.edge,
      currentX: conn.cx,
      currentY: conn.cy,
      targetNodeId: null,
    });
  }, [onConnect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const svg = (e.target as Element).closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (disconnectDragRef.current) {
      const d = disconnectDragRef.current;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const moved = d.moved || Math.abs(dx) > 5 || Math.abs(dy) > 5;
      setDisconnectDrag(prev => prev ? { ...prev, currentX: x, currentY: y, moved } : null);
      return;
    }

    if (!dragStateRef.current) return;

    let targetNodeId: string | null = null;
    nodePositions.forEach((pos, nodeId) => {
      if (nodeId === dragStateRef.current!.sourceNodeId) return;
      const margin = 15;
      if (
        x >= pos.x - margin && x <= pos.x + pos.width + margin &&
        y >= pos.y - margin && y <= pos.y + pos.height + margin
      ) {
        targetNodeId = nodeId;
      }
    });

    setDragState(prev => prev ? { ...prev, currentX: x, currentY: y, targetNodeId } : null);
  }, [nodePositions]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);

    if (disconnectDragRef.current) {
      const d = disconnectDragRef.current;
      if (d.moved && onDisconnect && d.parentNodeId) {
        onDisconnect(d.sourceNodeId, d.parentNodeId);
      } else {
        onModifyConnectionsClick(d.sourceNodeId);
      }
      setDisconnectDrag(null);
      return;
    }

    if (!dragStateRef.current || !onConnect) return;

    const state = dragStateRef.current;
    if (state.targetNodeId) {
      onConnect(state.sourceNodeId, state.targetNodeId);
    }
    setDragState(null);
  }, [onConnect, onDisconnect, onModifyConnectionsClick]);

  const handlePointerLeave = useCallback(() => {
    if (dragStateRef.current) {
      setDragState(null);
    }
    if (disconnectDragRef.current) {
      setDisconnectDrag(null);
    }
  }, []);

  const previewLine = dragState ? (() => {
    const sEdge = dragState.edge;
    const OFFSET = 25;
    let startX = dragState.cx, startY = dragState.cy;
    switch (sEdge) {
      case 'top': startY -= OFFSET; break;
      case 'bottom': startY += OFFSET; break;
      case 'left': startX -= OFFSET; break;
      case 'right': startX += OFFSET; break;
    }

    if (dragState.targetNodeId) {
      const targetPos = nodePositions.get(dragState.targetNodeId);
      if (targetPos) {
        const targetCenterX = targetPos.x + targetPos.width / 2;
        const targetCenterY = targetPos.y + targetPos.height / 2;
        const nodeCenterX = nodePositions.get(dragState.sourceNodeId)!;
        const srcCenterX = nodeCenterX.x + nodeCenterX.width / 2;
        const srcCenterY = nodeCenterX.y + nodeCenterX.height / 2;
        const tEdge = determineEdge(srcCenterX, srcCenterY, targetCenterX, targetCenterY);

        let endX: number, endY: number;
        switch (tEdge) {
          case 'top': endX = targetPos.x + targetPos.width / 2; endY = targetPos.y; break;
          case 'bottom': endX = targetPos.x + targetPos.width / 2; endY = targetPos.y + targetPos.height; break;
          case 'left': endX = targetPos.x; endY = targetPos.y + targetPos.height / 2; break;
          case 'right': endX = targetPos.x + targetPos.width; endY = targetPos.y + targetPos.height / 2; break;
        }

        const totalPath = computeOrthogonalPath(dragState.cx, dragState.cy, sEdge, endX, endY, tEdge);
        return totalPath;
      }
    }

    const midX = (startX + dragState.currentX) / 2;
    const midY = (startY + dragState.currentY) / 2;
    if (Math.abs(startX - dragState.currentX) > Math.abs(startY - dragState.currentY)) {
      return `M ${dragState.cx},${dragState.cy} L ${startX},${startY} L ${startX},${midY} L ${dragState.currentX},${midY} L ${dragState.currentX},${dragState.currentY}`;
    }
    return `M ${dragState.cx},${dragState.cy} L ${startX},${startY} L ${midX},${startY} L ${midX},${dragState.currentY} L ${dragState.currentX},${dragState.currentY}`;
  })() : null;

  const ghostConnectors = useMemo(() => {
    if (!ghostNodeId) return null;
    const pos = nodePositions.get(ghostNodeId);
    if (!pos) return null;
    const task = tasksMap.get(ghostNodeId);
    if (!task) return null;
    const status = getStatus(task, tasksMap);

    return {
      top: { cx: pos.x + pos.width / 2, cy: pos.y, status, nodeId: ghostNodeId },
      bottom: { cx: pos.x + pos.width / 2, cy: pos.y + pos.height, status, nodeId: ghostNodeId },
    };
  }, [ghostNodeId, nodePositions, tasksMap]);

  return (
    <svg
      className="connector-layer"
      overflow="visible"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {lines.map((line, i) => (
        <path key={`line-${i}`} className="connection-line" d={line.path} />
      ))}

      {previewLine && (
        <path className="connection-line preview" d={previewLine} />
      )}

      {disconnectDrag && disconnectDrag.moved && (
        <path
          className="connection-line disconnect"
          d={`M ${disconnectDrag.cx},${disconnectDrag.cy} L ${disconnectDrag.currentX},${disconnectDrag.currentY}`}
        />
      )}

      {connectors.map((conn) => {
        const shape = conn.type === 'input' ? (
          <circle
            className={`connector-shape ${conn.status}`}
            cx={conn.cx}
            cy={conn.cy}
            r={7}
            onPointerDown={(e) => handleInputPointerDown(e, conn)}
          />
        ) : (
          <polygon
            className={`connector-shape ${conn.status}`}
            points={getTrianglePoints(conn.cx, conn.cy, conn.edge)}
            onPointerDown={(e) => handleOutputPointerDown(e, conn)}
          />
        );
        return shape;
      })}

      {ghostConnectors && (
        <>
          <circle
            className="connector-shape ghost available"
            cx={ghostConnectors.top.cx}
            cy={ghostConnectors.top.cy}
            r={7}
            onPointerDown={(e) => handlePointerDown(e, {
              type: 'input', edge: 'top',
              cx: ghostConnectors.top.cx, cy: ghostConnectors.top.cy,
              status: ghostConnectors.top.status, nodeId: ghostConnectors.top.nodeId,
            })}
          />
          <polygon
            className="connector-shape ghost available"
            points={getTrianglePoints(ghostConnectors.bottom.cx, ghostConnectors.bottom.cy, 'bottom')}
            onPointerDown={(e) => handlePointerDown(e, {
              type: 'output', edge: 'bottom',
              cx: ghostConnectors.bottom.cx, cy: ghostConnectors.bottom.cy,
              status: ghostConnectors.bottom.status, nodeId: ghostConnectors.bottom.nodeId,
            })}
          />
        </>
      )}
    </svg>
  );
}
