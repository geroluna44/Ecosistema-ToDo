import { useState, useEffect, useMemo } from 'react';
import { Tarea, PoolTask } from '../../types/task';
import { clasificarPoolTask, ClasificarPoolInput } from '../../services/taskService';
import { TaskReferenceInput } from '../TaskReferenceInput';
import { SuggestionInput } from '../SuggestionInput';
import { parseDeadlineInput } from '../../utils/dateFormatting';

interface ClasificarTaskFormProps {
  poolTask: PoolTask;
  tasks: Map<string, Tarea>;
  onClose: () => void;
  onClasificado: () => void;
}

export function ClasificarTaskForm({ poolTask, tasks, onClose, onClasificado }: ClasificarTaskFormProps) {
  const [proyecto, setProyecto] = useState('');
  const [lugar, setLugar] = useState('');
  const [descripcion, setDescripcion] = useState(poolTask.descripcion);
  const [primerPaso, setPrimerPaso] = useState('');
  const [rangoTiempo, setRangoTiempo] = useState(30);
  const [urgencia, setUrgencia] = useState<'A' | 'B' | 'C'>('C');
  const [deadline, setDeadline] = useState('');
  const [tareaPadre, setTareaPadre] = useState<string[]>([]);
  const [tareaHija, setTareaHija] = useState<string[]>([]);
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

  useEffect(() => {
    setDescripcion(poolTask.descripcion);
  }, [poolTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const input: ClasificarPoolInput = {
      lugar: lugar.trim() || undefined,
      proyecto: proyecto.trim() || undefined,
      descripcion: descripcion.trim() || undefined,
      primer_paso: primerPaso.trim() || undefined,
      rango_tiempo: rangoTiempo > 0 ? rangoTiempo : undefined,
      urgencia,
      deadline: deadline ? parseDeadlineInput(deadline) || undefined : undefined,
      tarea_padre: tareaPadre.length > 0 ? tareaPadre.join(',') : undefined,
      tarea_hija: tareaHija.length > 0 ? tareaHija.join(',') : undefined,
    };

    try {
      await clasificarPoolTask(poolTask.filename, input);
      onClasificado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al clasificar la tarea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quick-add-form-overlay" onClick={onClose}>
      <div className="quick-add-form quick-task-form" onClick={e => e.stopPropagation()}>
        <div className="quick-add-form-header">
          <h3>CLASIFICAR: {poolTask.nombre}</h3>
          <button className="quick-add-form-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Archivo origen</label>
            <input type="text" value={poolTask.filename} disabled />
          </div>

          <div className="form-row">
            <SuggestionInput
              label="Proyecto"
              value={proyecto}
              suggestions={proyectos}
              onChange={setProyecto}
              placeholder="Opcional"
            />
            <SuggestionInput
              label="Lugar de trabajo"
              value={lugar}
              suggestions={lugares}
              onChange={setLugar}
              placeholder="Opcional"
            />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Primer paso</label>
            <input
              type="text"
              value={primerPaso}
              onChange={e => setPrimerPaso(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Rango de tiempo (min)</label>
              <input
                type="number"
                value={rangoTiempo}
                onChange={e => setRangoTiempo(parseInt(e.target.value, 10) || 0)}
                min={0}
              />
            </div>
            <div className="form-group">
              <label>Urgencia</label>
              <select
                value={urgencia}
                onChange={e => setUrgencia(e.target.value as 'A' | 'B' | 'C')}
              >
                <option value="A">A - Alta</option>
                <option value="B">B - Media</option>
                <option value="C">C - Baja</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Deadline (dd/mm hh:mm)</label>
            <input
              type="text"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              placeholder="06/08 17:30"
            />
          </div>

          <div className="form-row">
            <TaskReferenceInput
              label="Tarea Padre"
              value={tareaPadre}
              tasks={tasks}
              onChange={setTareaPadre}
              placeholder="Escribir nombre..."
            />
            <TaskReferenceInput
              label="Tarea Hija"
              value={tareaHija}
              tasks={tasks}
              onChange={setTareaHija}
              placeholder="Escribir nombre..."
            />
          </div>

          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Clasificando…' : 'Clasificar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
