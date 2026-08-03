import { useState, useMemo } from 'react';
import { createPoolTask, createClasificadaTask, ClasificadaTaskInput } from '../services/taskService';
import { TaskReferenceInput } from './TaskReferenceInput';
import { SuggestionInput } from './SuggestionInput';
import { Tarea } from '../types/task';

type MenuState = 'closed' | 'menu' | 'add' | 'quick';

interface QuickAddFABProps {
  tasks: Map<string, Tarea>;
  onReload?: () => void;
}

export function QuickAddFAB({ tasks, onReload }: QuickAddFABProps) {
  const [menuState, setMenuState] = useState<MenuState>('closed');

  const handleToggle = () => {
    setMenuState(prev => prev === 'closed' ? 'menu' : 'closed');
  };

  return (
    <div className="quick-add-fab-container">
      {menuState === 'add' && (
        <AddTaskForm onClose={() => setMenuState('closed')} onReload={onReload} />
      )}
      {menuState === 'quick' && (
        <QuickTaskForm tasks={tasks} onClose={() => setMenuState('closed')} onReload={onReload} />
      )}
      <div className={`quick-add-fab ${menuState !== 'closed' ? 'active' : ''}`}>
        <button
          className="fab-toggle"
          onClick={handleToggle}
          title="Añadir tarea"
        >
          +
        </button>
        {menuState === 'menu' && (
          <div className="fab-menu">
            <button
              className="fab-menu-item"
              onClick={() => setMenuState('quick')}
            >
              AÑADIR TAREA
            </button>
            <button
              className="fab-menu-item"
              onClick={() => setMenuState('add')}
            >
              TAREA RÁPIDA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddTaskForm({ onClose, onReload }: { onClose: () => void; onReload?: () => void }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setSaving(true);
    setError('');

    try {
      await createPoolTask({ nombre: nombre.trim(), descripcion: descripcion.trim() });
      setNombre('');
      setDescripcion('');
      onReload?.();
      onClose();
    } catch (err) {
      setError('Error al crear la tarea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quick-add-form-overlay" onClick={onClose}>
      <div className="quick-add-form" onClick={e => e.stopPropagation()}>
        <div className="quick-add-form-header">
          <h3>TAREA RÁPIDA</h3>
          <button className="quick-add-form-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="add-nombre">Título</label>
            <input
              id="add-nombre"
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre de la tarea"
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="add-descripcion">Descripción (opcional)</label>
            <textarea
              id="add-descripcion"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción o notas..."
              rows={4}
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !nombre.trim()}>
              {saving ? 'Guardando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickTaskForm({ tasks, onClose, onReload }: { tasks: Map<string, Tarea>; onClose: () => void; onReload?: () => void }) {
  const [formData, setFormData] = useState<ClasificadaTaskInput>({
    nombre: '',
    lugar: '',
    proyecto: '',
    descripcion: '',
    primer_paso: '',
    rango_tiempo: 30,
    urgencia: 'C',
    deadline: 0,
    tarea_padre: '',
    tarea_hija: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const proyectos = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => { if (t.Proyecto) set.add(t.Proyecto); });
    return Array.from(set).sort();
  }, [tasks]);

  const lugares = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => { if (t['Lugar de trabajo']) set.add(t['Lugar de trabajo']); });
    return Array.from(set).sort();
  }, [tasks]);

  const handleChange = (field: keyof ClasificadaTaskInput, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;

    setSaving(true);
    setError('');

    try {
      await createClasificadaTask(formData);
      setFormData({
        nombre: '',
        lugar: '',
        proyecto: '',
        descripcion: '',
        primer_paso: '',
        rango_tiempo: 30,
        urgencia: 'C',
        deadline: 0,
        tarea_padre: '',
        tarea_hija: '',
      });
      onReload?.();
      onClose();
    } catch (err) {
      setError('Error al crear la tarea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quick-add-form-overlay" onClick={onClose}>
        <div className="quick-add-form quick-task-form" onClick={e => e.stopPropagation()}>
        <div className="quick-add-form-header">
          <h3>AÑADIR TAREA</h3>
          <button className="quick-add-form-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quick-nombre">Título *</label>
              <input
                id="quick-nombre"
                type="text"
                value={formData.nombre}
                onChange={e => handleChange('nombre', e.target.value)}
                required
              />
            </div>
            <SuggestionInput
              id="quick-proyecto"
              label="Proyecto"
              value={formData.proyecto}
              suggestions={proyectos}
              onChange={val => handleChange('proyecto', val)}
              placeholder="Escribir..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="quick-descripcion">Descripción</label>
            <textarea
              id="quick-descripcion"
              value={formData.descripcion}
              onChange={e => handleChange('descripcion', e.target.value)}
              rows={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="quick-primer-paso">Primer paso</label>
            <input
              id="quick-primer-paso"
              type="text"
              value={formData.primer_paso}
              onChange={e => handleChange('primer_paso', e.target.value)}
            />
          </div>

          <div className="form-row">
            <SuggestionInput
              id="quick-lugar"
              label="Lugar"
              value={formData.lugar}
              suggestions={lugares}
              onChange={val => handleChange('lugar', val)}
              placeholder="Escribir..."
            />
            <div className="form-group">
              <label htmlFor="quick-rango">Tiempo (min)</label>
              <input
                id="quick-rango"
                type="number"
                value={formData.rango_tiempo}
                onChange={e => handleChange('rango_tiempo', parseInt(e.target.value) || 0)}
                min={1}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quick-urgencia">Urgencia</label>
              <select
                id="quick-urgencia"
                value={formData.urgencia}
                onChange={e => handleChange('urgencia', e.target.value as 'A' | 'B' | 'C')}
              >
                <option value="A">A - Alta</option>
                <option value="B">B - Media</option>
                <option value="C">C - Baja</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="quick-deadline">Deadline (YYYYMMDD)</label>
              <input
                id="quick-deadline"
                type="number"
                value={formData.deadline || ''}
                onChange={e => handleChange('deadline', parseInt(e.target.value) || 0)}
                placeholder="YYYYMMDD"
              />
            </div>
          </div>

          <div className="form-row">
            <TaskReferenceInput
              id="quick-padre"
              label="Tarea Padre"
              value={formData.tarea_padre}
              tasks={tasks}
              onChange={id => handleChange('tarea_padre', id)}
              placeholder="Escribir nombre..."
            />
            <TaskReferenceInput
              id="quick-hija"
              label="Tarea Hija"
              value={formData.tarea_hija}
              tasks={tasks}
              onChange={id => handleChange('tarea_hija', id)}
              placeholder="Escribir nombre..."
            />
          </div>

          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !formData.nombre.trim()}>
              {saving ? 'Guardando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}