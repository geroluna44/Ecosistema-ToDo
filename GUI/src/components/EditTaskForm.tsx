import { useState, useMemo } from 'react';
import { Tarea, Urgencia } from '../types/task';
import { writeTask } from '../services/taskService';
import { TaskReferenceInput } from './TaskReferenceInput';
import { SuggestionInput } from './SuggestionInput';

interface EditTaskFormProps {
  filename: string;
  task: Tarea;
  tasks: Map<string, Tarea>;
  onClose: () => void;
  onSaved: (filename: string, updated: Tarea) => void;
}

export function EditTaskForm({ filename, task, tasks, onClose, onSaved }: EditTaskFormProps) {
  const [formData, setFormData] = useState<Tarea>({ ...task });
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

  const handleChange = (field: keyof Tarea, value: string | number | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Nombre.trim()) return;

    setSaving(true);
    setError('');

    try {
      await writeTask(filename, formData);
      onSaved(filename, formData);
      onClose();
    } catch (err) {
      setError('Error al guardar la tarea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quick-add-form-overlay" onClick={onClose}>
      <div className="quick-add-form quick-task-form" onClick={e => e.stopPropagation()}>
        <div className="quick-add-form-header">
          <h3>EDITAR TAREA</h3>
          <button className="quick-add-form-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-nombre">Título *</label>
              <input
                id="edit-nombre"
                type="text"
                value={formData.Nombre}
                onChange={e => handleChange('Nombre', e.target.value)}
                required
              />
            </div>
            <SuggestionInput
              id="edit-proyecto"
              label="Proyecto"
              value={formData.Proyecto}
              suggestions={proyectos}
              onChange={val => handleChange('Proyecto', val)}
              placeholder="Escribir..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-descripcion">Descripción</label>
            <textarea
              id="edit-descripcion"
              value={formData.Descripcion}
              onChange={e => handleChange('Descripcion', e.target.value)}
              rows={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-primer-paso">Primer paso</label>
            <input
              id="edit-primer-paso"
              type="text"
              value={formData['Primer paso']}
              onChange={e => handleChange('Primer paso', e.target.value)}
            />
          </div>

          <div className="form-row">
            <SuggestionInput
              id="edit-lugar"
              label="Lugar de trabajo"
              value={formData['Lugar de trabajo']}
              suggestions={lugares}
              onChange={val => handleChange('Lugar de trabajo', val)}
              placeholder="Escribir..."
            />
            <div className="form-group">
              <label htmlFor="edit-rango">Tiempo (min)</label>
              <input
                id="edit-rango"
                type="number"
                value={formData['Rango de tiempo']}
                onChange={e => handleChange('Rango de tiempo', parseInt(e.target.value) || 0)}
                min={1}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-urgencia">Urgencia</label>
              <select
                id="edit-urgencia"
                value={formData.Urgencia}
                onChange={e => handleChange('Urgencia', e.target.value as Urgencia)}
              >
                <option value="A">A - Alta</option>
                <option value="B">B - Media</option>
                <option value="C">C - Baja</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="edit-deadline">Deadline (YYYYMMDD)</label>
              <input
                id="edit-deadline"
                type="number"
                value={formData.Deadline || ''}
                onChange={e => handleChange('Deadline', parseInt(e.target.value) || 0)}
                placeholder="YYYYMMDD"
              />
            </div>
          </div>

          <div className="form-row">
            <TaskReferenceInput
              id="edit-padre"
              label="Tarea Padre"
              value={formData['Tarea Padre'] || []}
              tasks={tasks}
              onChange={ids => handleChange('Tarea Padre', ids)}
              placeholder="Escribir nombre..."
            />
            <TaskReferenceInput
              id="edit-hija"
              label="Tarea Hija"
              value={formData['Tarea Hija'] || []}
              tasks={tasks}
              onChange={ids => handleChange('Tarea Hija', ids)}
              placeholder="Escribir nombre..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-completado">
              <input
                id="edit-completado"
                type="checkbox"
                checked={formData.completado || false}
                onChange={e => handleChange('completado', e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Completado
            </label>
          </div>

          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !formData.Nombre.trim()}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
