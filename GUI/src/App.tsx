import { useTasks, buildSkillTree } from './hooks/useTasks';
import { ViewSelector } from './components/ViewSelector';
import { SkillTree } from './components/SkillTree/SkillTree';
import { Vista } from './types/task';
import { useState, useMemo } from 'react';

function App() {
  const { tasks, loading, error, toggleComplete } = useTasks();
  const [vistaActiva, setVistaActiva] = useState<Vista>('arbol');

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

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Ecosistema ToDo</h1>
      </header>
      
      <main className="app-main">
        <ViewSelector vistaActiva={vistaActiva} onVistaChange={setVistaActiva} />
        
        {loading && <div className="loading">Cargando tareas...</div>}
        
        {error && <div className="error">Error: {error}</div>}
        
        {!loading && !error && vistaActiva === 'arbol' && (
          <SkillTree
            projects={skillTreeData}
            onToggleComplete={handleToggleComplete}
          />
        )}
        
        {!loading && !error && vistaActiva === 'calendario' && (
          <div className="loading">Vista calendario (próximamente)</div>
        )}
        
        {!loading && !error && vistaActiva === 'nodos' && (
          <div className="loading">Vista de nodos (próximamente)</div>
        )}
      </main>
    </div>
  );
}

export default App;