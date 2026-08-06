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
import { deleteTask, trashProject, emptyTrash, updateConnection, removeConnection, restoreTask, setDebugMode } from './services/taskService';
import './styles/zoom-controls.css';
import './styles/quick-add-fab.css';
import './styles/hamburger-menu.css';
import './styles/papelera-view.css';

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

interface UndoToast {
  filename: string;
  nombre: string;
}

function App() {
  const { tasks, poolTasks, loading, error, toggleComplete, reload } = useTasks();
  const [vistaActiva, setVistaActiva] = useState<Vista>(() => {
    try {
      const saved = localStorage.getItem('vistaActiva');
      const validViews: Vista[] = ['lista', 'arbol', 'calendario', 'nodos', 'papelera'];
      return (saved && validViews.includes(saved as Vista)) ? saved as Vista : 'lista';
    } catch {
      return 'lista';
    }
  });
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [editingFilename, setEditingFilename] = useState<string | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [sortOpen, setSortOpen] = useState(false);
  const [connectionMode, setConnectionMode] = useState('proyecto');
  const [modifyingNodeId, setModifyingNodeId] = useState<string | null>(null);
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [debugMode, setDebugModeState] = useState(() => {
    try {
      return localStorage.getItem('debugMode') === 'true';
    } catch {
      return false;
    }
  });
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousViewRef = useRef<Vista>('lista');
  const sortRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('vistaActiva', vistaActiva);
    } catch {}
  }, [vistaActiva]);

  useEffect(() => {
    try {
      localStorage.setItem('debugMode', String(debugMode));
    } catch {}
    setDebugMode(debugMode);
  }, [debugMode]);

  const skillTreeData = useMemo(() => {
    return buildSkillTree(tasks);
  }, [tasks]);

  const handleToggleComplete = async (filename: string) => {
    try {
      await toggleComplete(filename);
    } catch (e) {
      setActionError(`No se pudo cambiar el estado: ${e instanceof Error ? e.message : e}`);
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleEditTask = useCallback((filename: string) => {
    setEditingFilename(filename);
  }, []);

  const handleTrashTask = useCallback(async (filename: string) => {
    const task = tasks.get(filename);
    const nombre = task?.Nombre || filename;
    try {
      await deleteTask(filename);
      reload();
      setUndoToast({ filename, nombre });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
    } catch (e) {
      setActionError(`No se pudo enviar "${nombre}" a la papelera: ${e instanceof Error ? e.message : e}`);
      setTimeout(() => setActionError(null), 5000);
    }
  }, [tasks, reload]);

  const handleUndoTrash = useCallback(async () => {
    if (!undoToast) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    try {
      await restoreTask(undoToast.filename);
      reload();
    } catch (e) {
      setActionError(`No se pudo restaurar: ${e instanceof Error ? e.message : e}`);
      setTimeout(() => setActionError(null), 5000);
    }
    setUndoToast(null);
  }, [undoToast, reload]);

  const handleTrashProject = useCallback(async (proyecto: string) => {
    if (!confirm(`¿Mover todo el proyecto "${proyecto}" a la papelera?`)) return;
    try {
      await trashProject(proyecto);
      reload();
    } catch (e) {
      setActionError(`No se pudo enviar el proyecto "${proyecto}" a la papelera: ${e instanceof Error ? e.message : e}`);
      setTimeout(() => setActionError(null), 5000);
    }
  }, [reload]);

  const handleConnect = useCallback(async (parentId: string, childId: string) => {
    try {
      await updateConnection(childId, parentId, tasks);
      reload();
    } catch (e) {
      setActionError(`No se pudo conectar las tareas: ${e instanceof Error ? e.message : e}`);
      setTimeout(() => setActionError(null), 5000);
    }
  }, [tasks, reload]);

  const handleDisconnect = useCallback(async (childId: string) => {
    try {
      await removeConnection(childId, tasks);
      reload();
    } catch (e) {
      setActionError(`No se pudo desconectar la tarea: ${e instanceof Error ? e.message : e}`);
      setTimeout(() => setActionError(null), 5000);
    }
  }, [tasks, reload]);

  const handleEmptyTrash = useCallback(async () => {
    try {
      await emptyTrash();
      reload();
    } catch (e) {
      setActionError(`No se pudo vaciar la papelera: ${e instanceof Error ? e.message : e}`);
      setTimeout(() => setActionError(null), 5000);
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
    previousViewRef.current = vistaActiva;
    setVistaActiva('papelera');
  }, [vistaActiva]);

  const handleToggleDebug = useCallback(() => {
    setDebugModeState(prev => {
      const next = !prev;
      setDebugMode(next);
      reload();
      return next;
    });
  }, [reload]);

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
        {debugMode && <span className="debug-badge">DEBUG</span>}
        <HamburgerMenu onSelectPapelera={handleSelectPapelera} debugMode={debugMode} onToggleDebug={handleToggleDebug} />
      </header>
      
      <main className="app-main">
        {vistaActiva !== 'papelera' && (
          <>
            <ViewSelector vistaActiva={vistaActiva} onVistaChange={setVistaActiva} />
            {vistaActiva === 'arbol' && (
              <ZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onZoomReset={zoomReset} onPanBy={panBy} onPanHome={panHome} />
            )}
            <QuickAddFAB tasks={tasks} onReload={reload} />
          </>
        )}

        {loading && <div className="loading">Cargando tareas...</div>}

        {error && <div className="error">Error: {error}</div>}

        {actionError && <div className="error">{actionError}</div>}

        {undoToast && vistaActiva === 'lista' && (
          <div className="app-undo-toast" onClick={handleUndoTrash}>
            Descartado. <span>Click para deshacer</span>
          </div>
        )}

        {!loading && !error && vistaActiva === 'lista' && (
          <ListView
            tasks={tasks}
            poolTasks={poolTasks}
            onEdit={handleEditTask}
            onTrash={handleTrashTask}
            onToggleComplete={handleToggleComplete}
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
          <PapeleraView onBack={() => setVistaActiva(previousViewRef.current)} onEmptyTrash={handleEmptyTrash} onReload={reload} />
        )}
      </main>

      {editingFilename && editingTask && (
        <EditTaskForm
          filename={editingFilename}
          task={editingTask}
          tasks={tasks}
          onClose={handleCloseEdit}
          onSaved={handleTaskSaved}
        />
      )}
    </div>
  );
}

export default App;
