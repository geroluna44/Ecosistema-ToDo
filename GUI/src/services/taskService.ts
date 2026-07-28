import { Tarea } from '../types/task';

const TASKS_DIR = '/home/gero/tareas/clasificadas';
const POOL_DIR = '/home/gero/tareas/pool';

interface TaskServerConfig {
  listUrl: string;
  getUrl: (filename: string) => string;
  putUrl: (filename: string) => string;
  postPoolUrl: string;
  postTaskUrl: string;
}

const DEV_CONFIG: TaskServerConfig = {
  listUrl: '/tareas/',
  getUrl: (f: string) => `/tareas/${f}`,
  putUrl: (f: string) => `/tareas/${f}`,
  postPoolUrl: '/tareas/pool',
  postTaskUrl: '/tareas/',
};

const PROD_CONFIG: TaskServerConfig = {
  listUrl: TASKS_DIR,
  getUrl: (f: string) => `${TASKS_DIR}/${f}`,
  putUrl: (f: string) => `${TASKS_DIR}/${f}`,
  postPoolUrl: POOL_DIR,
  postTaskUrl: TASKS_DIR,
};

const isDevelopment = import.meta.env.DEV;

let serverConfig = isDevelopment ? DEV_CONFIG : PROD_CONFIG;

export function configureTaskServer(config: Partial<TaskServerConfig>) {
  serverConfig = { ...serverConfig, ...config };
}

export async function readTasks(): Promise<Map<string, Tarea>> {
  const tasks = new Map<string, Tarea>();

  try {
    const response = await fetch(serverConfig.listUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const html = await response.text();

    const fileRegex = /href="(202\d{11}\.json)"/g;
    let match;
    const filenames: string[] = [];

    while ((match = fileRegex.exec(html)) !== null) {
      filenames.push(match[1]);
    }

    const fileContents = await Promise.all(
      filenames.map(async (filename) => {
        try {
          const fileResponse = await fetch(serverConfig.getUrl(filename));
          if (fileResponse.ok) {
            return { filename, task: await fileResponse.json() as Tarea };
          }
        } catch (e) {
          console.warn(`Error reading ${filename}:`, e);
        }
        return null;
      })
    );

    fileContents.forEach((result) => {
      if (result) {
        tasks.set(result.filename, result.task);
      }
    });
  } catch (e) {
    console.error('Error reading tasks directory:', e);
    throw e;
  }

  return tasks;
}

export async function writeTask(filename: string, task: Tarea): Promise<void> {
  const response = await fetch(serverConfig.putUrl(filename), {
    method: 'PUT',
    body: JSON.stringify(task, null, 4),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to write ${filename}: HTTP ${response.status}`);
  }
}

export interface PoolTaskInput {
  nombre: string;
  descripcion: string;
}

export interface ClasificadaTaskInput {
  nombre: string;
  lugar: string;
  proyecto: string;
  descripcion: string;
  primer_paso: string;
  rango_tiempo: number;
  urgencia: 'A' | 'B' | 'C';
  deadline: number;
  tarea_padre: string;
  tarea_hija: string;
}

export async function createPoolTask(input: PoolTaskInput): Promise<{ filename: string }> {
  const response = await fetch(serverConfig.postPoolUrl, {
    method: 'POST',
    body: JSON.stringify(input),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to create pool task: HTTP ${response.status}`);
  }

  return response.json();
}

export async function createClasificadaTask(input: ClasificadaTaskInput): Promise<{ filename: string }> {
  const response = await fetch(serverConfig.postTaskUrl, {
    method: 'POST',
    body: JSON.stringify(input),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to create task: HTTP ${response.status}`);
  }

  return response.json();
}