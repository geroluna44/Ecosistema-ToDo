import { useState, useEffect, useCallback } from 'react';
import { Tarea, TareaRelacionada, PoolTask } from '../types/task';
import { readTasks, writeTask, readPoolTasks } from '../services/taskService';

export function useTasks() {
  const [tasks, setTasks] = useState<Map<string, Tarea>>(new Map());
  const [poolTasks, setPoolTasks] = useState<Map<string, PoolTask>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [loadedTasks, loadedPool] = await Promise.all([
        readTasks(),
        readPoolTasks().catch(() => new Map<string, PoolTask>()),
      ]);
      setTasks(loadedTasks);
      setPoolTasks(loadedPool);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const toggleComplete = useCallback(async (filename: string) => {
    const task = tasks.get(filename);
    if (!task) return;

    const updatedTask = { ...task, completado: !task.completado };
    
    setTasks(prev => {
      const next = new Map(prev);
      next.set(filename, updatedTask);
      return next;
    });

    try {
      await writeTask(filename, updatedTask);
    } catch (e) {
      setTasks(prev => {
        const next = new Map(prev);
        next.set(filename, task);
        return next;
      });
      throw e;
    }
  }, [tasks]);

  return {
    tasks,
    poolTasks,
    loading,
    error,
    toggleComplete,
    reload: loadTasks,
  };
}

export function buildSkillTree(tasks: Map<string, Tarea>): Map<string, TareaRelacionada[]> {
  const result = new Map<string, TareaRelacionada[]>();
  const taskArray = Array.from(tasks.entries());
  
  const childCount = new Map<string, number>();
  taskArray.forEach(([, task]) => {
    const parents = task['Tarea Padre'] || [];
    parents.forEach(parent => {
      childCount.set(parent, (childCount.get(parent) || 0) + 1);
    });
  });

  const nivelCache = new Map<string, number>();
  const calculateNivel = (filename: string, visiting = new Set<string>()): number => {
    const cached = nivelCache.get(filename);
    if (cached !== undefined) return cached;

    if (visiting.has(filename)) {
      nivelCache.set(filename, 0);
      return 0;
    }

    const nextVisiting = new Set(visiting);
    nextVisiting.add(filename);
    
    const task = tasks.get(filename);
    const parents = task?.['Tarea Padre'] || [];
    if (!task || parents.length === 0) {
      nivelCache.set(filename, 0);
      return 0;
    }
    
    const nivel = 1 + Math.min(...parents.map(p => calculateNivel(p, nextVisiting)));
    nivelCache.set(filename, nivel);
    return nivel;
  };

  const completedSet = new Set<string>();
  taskArray.forEach(([filename, task]) => {
    if (task.completado) {
      completedSet.add(filename);
    }
  });

  taskArray.forEach(([filename, task]) => {
    const nivel = calculateNivel(filename);
    const parents = task['Tarea Padre'] || [];
    const esRaiz = parents.length === 0;
    
    const tieneHijosPendientes = (childCount.get(filename) || 0) > 0 && 
      !completedSet.has(filename);

    const relacionada: TareaRelacionada = {
      ...task,
      id: filename,
      nivel,
      esRaiz,
      tieneHijosPendientes,
    };

    const proyecto = task.Proyecto || 'Sin proyecto';
    const existing = result.get(proyecto);
    if (existing) {
      existing.push(relacionada);
    } else {
      result.set(proyecto, [relacionada]);
    }
  });

  result.forEach((tareas) => {
    tareas.sort((a, b) => {
      if (a.esRaiz && !b.esRaiz) return -1;
      if (!a.esRaiz && b.esRaiz) return 1;
      return a.nivel - b.nivel;
    });
  });

  return result;
}
