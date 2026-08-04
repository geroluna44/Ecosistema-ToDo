# Ecosistema-ToDo

## Reglas para IAs y desarrolladores

**Toda interacción con la base de datos de tareas (archivos JSON en
`~/tareas/clasificadas/`, `~/tareas/pool/`, `~/tareas/papelera/`) DEBE
hacerse exclusivamente a través de los programas del ecosistema:**

- `addtarea` — Crear tareas nuevas en el pool
- `clatarea` — Clasificar, modificar y establecer relaciones padre-hija
- `trashtarea` — Mover a papelera, restaurar y eliminar

**NUNCA escribir, modificar o eliminar archivos JSON de tareas directamente.**

Excepciones permitidas:
- `serve_tasks.py` puede leer archivos JSON para listarlos y servirlos
  por HTTP (operaciones GET)
- Operaciones de debug en `~/tareas/debug/` seguirán esta misma regla

**¿Por qué?** Estos programas manejan la sincronización bidireccional
de relaciones padre-hija, validación de campos, y otras invariantes de
datos. Saltarse estos programas rompe la integridad de los datos.

## Estructura del proyecto

```
Ecosistema-ToDo/
├── Programa_addtarea/addtarea        # Crea .txt en pool/
├── Programa_clatarea/clatarea.py     # Clasifica, modifica, relaciona
│   └── tests/test_clatarea.py        # Tests: python -m unittest tests.test_clatarea
├── Programa_trashtarea/trashtarea    # Papelera: mover, restaurar, eliminar
├── GUI/                              # React + TypeScript + Vite
│   ├── serve_tasks.py                # Backend HTTP (puerto 8080)
│   ├── src/                          # Frontend
│   └── dist/                         # Build de producción
├── specs-usadas/                     # Specs de funcionalidades de la GUI
└── vinculacion-con-hermes.md         # Cómo Hermes usa estos programas
```

## Datos

Las tareas viven en `~/tareas/`:
- `~/tareas/pool/*.txt` — Tareas sin clasificar
- `~/tareas/clasificadas/*.json` — Tareas clasificadas
- `~/tareas/papelera/*.json` — Tareas eliminadas
- `~/tareas/debug/` — Mismo esquema para modo debug de la GUI

### Estructura del JSON

```json
{
    "Nombre": "string (obligatorio)",
    "Lugar de trabajo": "string",
    "Proyecto": "string",
    "Descripcion": "string",
    "Primer paso": "string",
    "Rango de tiempo": "int (minutos)",
    "Postergaciones": "int",
    "Urgencia": "A | B | C",
    "Deadline": "int (YYYYMMDDHHMMSS)",
    "Tarea Padre": ["filename.json", "..."],
    "Tarea Hija": ["filename.json", "..."],
    "completado": "bool"
}
```

### Relaciones padre-hija: muchos-a-muchos

Una tarea puede tener **varios padres y varias hijas**. La sincronización es
bidireccional: al asignar un padre, la otra tarea se actualiza automáticamente
(agregando la hija a su lista). Ver `Programa_clatarea/spec.md` para detalles.

## Programas

### addtarea
Crea tareas nuevas como `.txt` en `~/tareas/pool/`.
Spec: `Programa_addtarea/README.md`

### clatarea
Clasifica, modifica y establece relaciones padre-hija.
Soporta múltiples `-m CAMPO=VALOR`. Los nombres de campo son case-insensitive
y tienen alias (`padre` → `Tarea Padre`, `hija` → `Tarea Hija`, etc.).

```bash
clatarea [ARCHIVO | -n "NOMBRE"] -m CAMPO=VALOR [-m ...]
clatarea --dir DIRECTORIO_BASE [args]
```

Spec completa: `Programa_clatarea/spec.md`

### trashtarea
Gestiona la papelera: mover, restaurar, listar, eliminar, vaciar.

```bash
trashtarea ARCHIVO.json           # mover a papelera
trashtarea -r ARCHIVO.json        # restaurar
trashtarea -d ARCHIVO.json        # eliminar permanente
trashtarea -e                     # vaciar papelera
trashtarea --dir DIRECTORIO_BASE  # usar directorio custom
```

Spec: `Programa_trashtarea/spec.md`

### ⚠️ Flag --dir: comportamiento CRÍTICO

En `clatarea` y `trashtarea`, el flag `--dir` espera el **directorio BASE**
(`~/tareas` o `~/tareas/debug`), NO el subdirectorio `clasificadas/`.
Los programas construyen `clasificadas/`, `pool/` y `papelera/` a partir de él.

```bash
✅ clatarea --dir ~/tareas -n "Tarea"
❌ clatarea --dir ~/tareas/clasificadas -n "Tarea"
   → Crea ~/tareas/clasificadas/clasificadas/ (incorrecto)
```

Lo mismo para trashtarea. `serve_tasks.py` ya maneja esto correctamente.

## GUI

Stack: React 18 + TypeScript + Vite. Backend: `serve_tasks.py` (HTTP, puerto 8080).

```bash
cd GUI && npm run dev              # Frontend en puerto 5173/5174
cd GUI && python3 serve_tasks.py   # Backend en puerto 8080
cd GUI && npm run build            # Build de producción
```

`serve_tasks.py` lee JSONs directamente solo para GET. Todas las operaciones
de escritura llaman a `clatarea` o `trashtarea` vía subprocess.

La GUI tiene modo debug (menú hamburguesa) que opera sobre `~/tareas/debug/`
usando el mismo esquema de directorios.

### Campos en la GUI

El frontend usa versiones normalizadas de los campos:
- `tarea_padre` / `tarea_hija` (snake_case) en formularios
- Se convierten a `Tarea Padre` / `Tarea Hija` (con espacios) antes de llamar a clatarea
- Los valores son arrays de filenames; se serializan como string separado por comas
  en los argumentos `-m` de clatarea
- Al leer, se normalizan: strings legacy se convierten a arrays automáticamente

### Contrato HTTP de serve_tasks.py

**GET** (solo lectura, permite acceso directo a JSONs):
```
GET /                          → Lista clasificadas (HTML)
GET /tareas/                   → Lista clasificadas (HTML)
GET /tareas/{filename}         → Obtener JSON de tarea
GET /pool/                     → Lista pool (JSON array)
GET /pool/{filename}           → Obtener contenido de .txt
GET /papelera/                 → Lista papelera (HTML)
GET /papelera/{filename}       → Obtener JSON de tarea en papelera
GET /debug/                    → Lista debug clasificadas (HTML)
GET /debug/{filename}          → Obtener JSON de tarea debug
GET /debug/pool/               → Lista debug pool (JSON array)
GET /debug/pool/{filename}     → Obtener contenido de .txt debug
GET /debug-papelera/           → Lista debug papelera (HTML)
GET /debug-papelera/{filename} → Obtener JSON de tarea debug en papelera
```

**POST** (creación y clasificación, usa clatarea/addtarea):
```
POST /tareas/                           → Crear tarea clasificada
POST /tareas/pool                       → Crear tarea en pool
POST /tareas/pool/{filename}/clasificar → Clasificar tarea del pool
POST /papelera/{filename}/restore       → Restaurar tarea de papelera
POST /papelera/restore/project?proyecto=X → Restaurar proyecto completo
POST /papelera/empty                    → Vaciar papelera
POST /debug/                            → Crear tarea clasificada debug
POST /debug/pool                        → Crear tarea en pool debug
POST /debug/pool/{filename}/clasificar  → Clasificar tarea del pool debug
POST /debug-papelera/{filename}/restore → Restaurar tarea de papelera debug
```

**PUT** (modificación, usa clatarea):
```
PUT /tareas/{filename}  → Modificar tarea clasificada
PUT /debug/{filename}   → Modificar tarea clasificada debug
```

**DELETE** (eliminación, usa trashtarea):
```
DELETE /tareas/{filename}              → Mover a papelera
DELETE /tareas/?proyecto=X             → Mover proyecto a papelera
DELETE /papelera/{filename}            → Eliminar permanente de papelera
DELETE /papelera/                      → Vaciar papelera
DELETE /debug/{filename}               → Mover a papelera debug
DELETE /debug-papelera/{filename}      → Eliminar permanente de papelera debug
DELETE /debug-papelera/                → Vaciar papelera debug
```

## Tests

```bash
cd Programa_clatarea && python -m unittest tests.test_clatarea -v
```

## Hermes

Hermes es el asistente que gestiona estas tareas desde la Raspi. Opera via CLI
llamando a addtarea/clatarea/trashtarea. Ver `vinculacion-con-hermes.md`.
