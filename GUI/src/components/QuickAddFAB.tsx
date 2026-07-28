import { useState } from 'react';
import { createPoolTask, createClasificadaTask, ClasificadaTaskInput } from '../services/taskService';

type MenuState = 'closed' | 'menu' | 'add' | 'quick';

export function QuickAddFAB() {
  const [menuState, setMenuState] = useState<MenuState>('closed');

  const handleToggle = () => {
    setMenuState(prev => prev === 'closed' ? 'menu' : 'closed');
  };

  return (
    <div className="quick-add-fab-container">
      {menuState === 'add' && (
        <AddTaskForm onClose={() => setMenuState('closed')} />
      )}
      {menuState === 'quick' && (
        <QuickTaskForm onClose={() => setMenuState('closed')} />
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

function AddTaskForm({ onClose }: { onClose: () => void }) {
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
          <h3>AÑADIR TAREA</h3>
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

function QuickTaskForm({ onClose }: { onClose: () => void }) {
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
          <h3>TAREA RÁPIDA</h3>
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
            <div className="form-group">
              <label htmlFor="quick-proyecto">Proyecto</label>
              <input
                id="quick-proyecto"
                type="text"
                value={formData.proyecto}
                onChange={e => handleChange('proyecto', e.target.value)}
              />
            </div>
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
            <div className="form-group">
              <label htmlFor="quick-lugar">Lugar</label>
              <input
                id="quick-lugar"
                type="text"
                value={formData.lugar}
                onChange={e => handleChange('lugar', e.target.value)}
              />
            </div>
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
            <div className="form-group">
              <label htmlFor="quick-padre">Tarea Padre</label>
              <input
                id="quick-padre"
                type="text"
                value={formData.tarea_padre}
                onChange={e => handleChange('tarea_padre', e.target.value)}
                placeholder="nombre.json"
              />
            </div>
            <div className="form-group">
              <label htmlFor="quick-hija">Tarea Hija</label>
              <input
                id="quick-hija"
                type="text"
                value={formData.tarea_hija}
                onChange={e => handleChange('tarea_hija', e.target.value)}
                placeholder="nombre.json"
              />
            </div>
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