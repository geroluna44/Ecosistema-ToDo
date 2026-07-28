export type Urgencia = 'A' | 'B' | 'C';

export interface Tarea {
  Nombre: string;
  'Lugar de trabajo': string;
  Proyecto: string;
  Descripcion: string;
  'Primer paso': string;
  'Rango de tiempo': number;
  Postergaciones: number;
  Urgencia: Urgencia;
  Deadline: number;
  'Tarea Padre': string;
  'Tarea Hija': string;
  completado?: boolean;
}

export interface TareaRelacionada extends Tarea {
  id: string;
  nivel: number;
  esRaiz: boolean;
  tieneHijosPendientes: boolean;
}

export type Vista = 'arbol' | 'calendario' | 'nodos';

export interface PosicionNodo {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}