import { useTasks, buildSkillTree } from './hooks/useTasks';
import { ViewSelector } from './components/ViewSelector';
import { SkillTree } from './components/SkillTree/SkillTree';
import { ZoomControls } from './components/ZoomControls';
import { QuickAddFAB } from './components/QuickAddFAB';
import { EditTaskForm } from './components/EditTaskForm';
import { HamburgerMenu } from './components/HamburgerMenu';
import { PapeleraView } from './components/PapeleraView';
import { ListView } from './components/ListView/ListView';
import { Tarea, Vista } from './types/task';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { deleteTask, trashProject, emptyTrash, updateConnection, removeConnection } from './services/taskService';
import './styles/zoom-controls.css';
import './styles/quick-add-fab.css';
import './styles/hamburger-menu.css';
import './styles/papelera-view.css';

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

function App() {
  const { tasks, poolTasks, loading, error, toggleComplete, reload } = useTasks();
  const [vistaActiva, setVistaActiva] = useState<Vista>('lista');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [editingFilename, setEditingFilename] = useState<string | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [sortOpen, setSortOpen] = useState(false);
  const [connectionMode, setConnectionMode] = useState('proyecto');
  const [modifyingNodeId, setModifyingNodeId] = useState<string | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  const skillTreeData = useMemo(() => {
    return buildSkillTree(tasks);
  }, [tasks]);

  const handleToggleComplete = async (filename: string) => {
    try {
      await toggleComplete(filename);
    } catch (e) {
      console.error('Error toggling task:', e);
    }
  };

  const handleEditTask = useCallback((filename: string) => {
    setEditingFilename(filename);
  }, []);

  const handleTrashTask = useCallback(async (filename: string) => {
    try {
      await deleteTask(filename);
      reload();
    } catch (e) {
      console.error('Error moving task to trash:', e);
    }
  }, [reload]);

  const handleTrashProject = useCallback(async (proyecto: string) => {
    if (!confirm(`¿Mover todo el proyecto "${proyecto}" a la papelera?`)) return;
    try {
      await trashProject(proyecto);
      reload();
    } catch (e) {
      console.error('Error trashing project:', e);
    }
  }, [reload]);

  const handleConnect = useCallback(async (parentId: string, childId: string) => {
    try {
      await updateConnection(childId, parentId, tasks);
      reload();
    } catch (e) {
      console.error('Error updating connection:', e);
    }
  }, [tasks, reload]);

  const handleDisconnect = useCallback(async (childId: string) => {
    try {
      await removeConnection(childId, tasks);
      reload();
    } catch (e) {
      console.error('Error removing connection:', e);
    }
  }, [tasks, reload]);

  const handleEmptyTrash = useCallback(async () => {
    try {
      await emptyTrash();
      reload();
    } catch (e) {
      console.error('Error emptying trash:', e);
    }
  }, [reload]);

  const handleCloseEdit = useCallback(() => {
    setEditingFilename(null);
  }, []);

  const handleTaskSaved = useCallback((_filename: string, _updated: Tarea) => {
    setEditingFilename(null);
    reload();
  }, [reload]);

  const editingTask = editingFilename ? tasks.get(editingFilename) : null;

  const zoomIn = () => setZoom(z => clamp(z + 0.25, 0.25, 5));
  const zoomOut = () => setZoom(z => clamp(z - 0.25, 0.25, 5));
  const zoomReset = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const panBy = (dx: number, dy: number) => {
    setOffsetX(x => x + dx);
    setOffsetY(y => y + dy);
  };

  const panHome = () => {
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.90 : 1.10;

    setZoom(prev => {
      const newZoom = clamp(prev * factor, 0.25, 5);
      const ratio = newZoom / prev;
      setOffsetX(prevX => cx - (cx - prevX) * ratio);
      setOffsetY(prevY => cy - (cy - prevY) * ratio);
      return newZoom;
    });
  }, []);

  const viewportCallbackRef = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      (viewportRef as React.MutableRefObject<HTMLDivElement>).current = el;
      el.addEventListener('wheel', handleWheel, { passive: false });
    }
  }, [handleWheel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.skill-node-wrapper, .zoom-controls, .view-selector, .quick-add-fab, .connector-shape, .sticky-info-card')) return;

    if (modifyingNodeId !== null) {
      setModifyingNodeId(null);
      return;
    }

    e.preventDefault();
    setIsPanning(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { x: offsetX, y: offsetY };
  }, [offsetX, offsetY, modifyingNodeId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffsetX(panStart.current.x + dx);
    setOffsetY(panStart.current.y + dy);
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleSelectPapelera = useCallback(() => {
    setVistaActiva('papelera');
  }, []);

  const handleModifyConnectionsChange = useCallback((nodeId: string | null) => {
    setModifyingNodeId(nodeId);
  }, []);

  const indicatorText = modifyingNodeId !== null
    ? 'Modificando conexiones'
    : `Conectado según ${connectionMode}`;

  const handleSort = useCallback((criterion: string) => {
    setConnectionMode(criterion);
    if (criterion === 'proyecto') {
      setLayoutVersion(v => v + 1);
    }
    setSortOpen(false);
  }, []);

  useEffect(() => {
    if (!sortOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sortOpen]);

  useEffect(() => {
    if (modifyingNodeId === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModifyingNodeId(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modifyingNodeId]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Ecosistema ToDo</h1>
        <HamburgerMenu onSelectPapelera={handleSelectPapelera} />
      </header>
      
      <main className="app-main">
        {vistaActiva !== 'papelera' && (
          <>
            <ViewSelector vistaActiva={vistaActiva} onVistaChange={setVistaActiva} />
            {vistaActiva === 'arbol' && (
              <ZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onZoomReset={zoomReset} onPanBy={panBy} onPanHome={panHome} />
            )}
            <QuickAddFAB />
          </>
        )}

        {loading && <div className="loading">Cargando tareas...</div>}

        {error && <div className="error">Error: {error}</div>}

        {!loading && !error && vistaActiva === 'lista' && (
          <ListView
            tasks={tasks}
            poolTasks={poolTasks}
            onEdit={handleEditTask}
            onReload={reload}
          />
        )}

        {!loading && !error && vistaActiva === 'arbol' && (
          <div
            ref={viewportCallbackRef}
            className={`tree-viewport ${isPanning ? 'panning' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="tree-transform-layer"
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
              }}
            >
              <SkillTree
                projects={skillTreeData}
                onToggleComplete={handleToggleComplete}
                onEditTask={handleEditTask}
                onTrashTask={handleTrashTask}
                onTrashProject={handleTrashProject}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                zoom={zoom}
                layoutVersion={layoutVersion}
                modifyingNodeId={modifyingNodeId}
                onModifyConnectionsChange={handleModifyConnectionsChange}
              />
            </div>
            <div className="connection-indicator">{indicatorText}</div>
            <div className="layout-selector" ref={sortRef}>
              <button className="sort-btn" onClick={() => setSortOpen(o => !o)}>
                Ordenar ▾
              </button>
              {sortOpen && (
                <ul className="sort-menu">
                  <li className="sort-option" onClick={() => handleSort('proyecto')}>
                    Por proyecto
                  </li>
                </ul>
              )}
            </div>
          </div>
        )}

        {!loading && !error && vistaActiva === 'calendario' && (
          <div className="loading">Vista calendario (próximamente)</div>
        )}

        {!loading && !error && vistaActiva === 'nodos' && (
          <div className="loading">Vista de nodos (próximamente)</div>
        )}

        {vistaActiva === 'papelera' && (
          <PapeleraView onBack={() => setVistaActiva('arbol')} onEmptyTrash={handleEmptyTrash} />
        )}
      </main>

      {editingFilename && editingTask && (
        <EditTaskForm
          filename={editingFilename}
          task={editingTask}
          onClose={handleCloseEdit}
          onSaved={handleTaskSaved}
        />
      )}
    </div>
  );
}

export default App;
