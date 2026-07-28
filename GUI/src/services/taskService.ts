import { Tarea } from '../types/task';

const TASK_DIR = '/home/gero/tareas/clasificadas';

interface TaskServerConfig {
  listUrl: string;
  getUrl: (filename: string) => string;
  putUrl: (filename: string) => string;
}

const defaultConfig: TaskServerConfig = {
  listUrl: TASK_DIR,
  getUrl: (f: string) => `${TASK_DIR}/${f}`,
  putUrl: (f: string) => `${TASK_DIR}/${f}`,
};

let serverConfig = defaultConfig;

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

export function getTasksByProject(tasks: Map<string, Tarea>): Map<string, Tarea[]> {
  const byProject = new Map<string, Tarea[]>();
  
  tasks.forEach((task) => {
    const proyecto = task.Proyecto || 'Sin proyecto';
    const existing = byProject.get(proyecto);
    if (existing) {
      existing.push(task);
    } else {
      byProject.set(proyecto, [task]);
    }
  });
  
  return byProject;
}