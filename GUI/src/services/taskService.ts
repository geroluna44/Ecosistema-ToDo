import { Tarea } from '../types/task';

const TASKS_DIR = '/home/gero/tareas/clasificadas';

interface TaskServerConfig {
  baseUrl: string;
}

const DEV_CONFIG: TaskServerConfig = {
  baseUrl: 'http://localhost:8080',
};

const PROD_CONFIG: TaskServerConfig = {
  baseUrl: TASKS_DIR,
};

const isDevelopment = import.meta.env.DEV;

let serverConfig = isDevelopment ? DEV_CONFIG : PROD_CONFIG;

export function configureTaskServer(config: Partial<TaskServerConfig>) {
  serverConfig = { ...serverConfig, ...config };
}

function getListUrl(): string {
  return `${serverConfig.baseUrl}/`;
}

function getFileUrl(filename: string): string {
  return `${serverConfig.baseUrl}/${filename}`;
}

export async function readTasks(): Promise<Map<string, Tarea>> {
  const tasks = new Map<string, Tarea>();

  try {
    const response = await fetch(getListUrl());
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
          const fileResponse = await fetch(getFileUrl(filename));
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
  const response = await fetch(getFileUrl(filename), {
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