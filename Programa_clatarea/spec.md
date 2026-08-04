# Programa clatarea

Programa que funciona dentro de un ecosistema de gestión de tareas, siguiendo la filosofía KISS y UNIX.
Ejecutable en CLI, escrito en Python. Diseñado para correr en una Raspi 3b con Hermes - ultra liviano.

## Recursos
- Python 3
- Linux

## Funcionalidad

### CLI

```
clatarea [ARCHIVO | -n "NOMBRE"] -m CAMPO=VALOR [-m CAMPO=VALOR ...]
```

**Formas de uso:**

1. **Desde archivo.txt en ~/tareas/pool/ (clasifica la tarea):**
   ```
   clatarea mi-tarea.txt -m lugar=Casa -m proyecto=Limpiar
   ```
   El nombre del `.txt` se usa como `Nombre`, el contenido como `Descripcion`.
   El resultado se guarda en `~/tareas/clasificadas/` como `YYYYMMDDHHMMSS.json`.

2. **Directo por nombre (crea nueva tarea):**
   ```
   clatarea -n "Mover cables" -m lugar=Casa -m proyecto="Instalar aire" -m descripcion="Traer cables del auto"
   ```
   Crea el archivo en `~/tareas/clasificadas/`.

3. **Modificar tarea existente:**
   ```
   clatarea 20260727183902.json -m urgencia=B -m "Rango de tiempo"=30
   ```

**Flags:**

| Flag | Descripción |
|------|-------------|
| `-n, --name` | Nombre de la nueva tarea (crea archivo si no existe) |
| `-m, --mod` | Par `CAMPO=VALOR` a modificar/agregar. Se puede usar múltiples veces. Usar comillas si el valor contiene espacios |
| `-h, --help` | Muestra esta ayuda y exit |

**Comportamiento:**
- Los `.txt` se leen de `~/tareas/pool/`. Si no existen, error.
- Los `.json` se crean/leen/modifican en `~/tareas/clasificadas/`.
- El nombre del archivo .json se genera con timestamp: `YYYYMMDDHHMMSS.json`
- Si el timestamp ya existe, se añade sufijo `b`, `c`, `d`, etc.
- `-m` es obligatorio solo para modificar tareas existentes (`.json`). Para crear con `-n` o desde `.txt` es opcional.

### Estructura del JSON

```json
{
    "Nombre": "Barrer pieza",
    "Lugar de trabajo": "Casa",
    "Proyecto": "Limpiar a fondo",
    "Descripcion": "Barrer el piso. Prestar atención a la esquina derecha",
    "Primer paso": "Buscar el escobillón",
    "Rango de tiempo": 20,
    "Postergaciones": 1,
    "Urgencia": "A",
    "Deadline": 20260728120000,
    "Tarea Padre": ["20260727183901.json"],
    "Tarea Hija": ["20260727183900.json", "20260727183905.json"]
}
```

**Campos fijos:**
- `Nombre` (str) - obligatorio
- `Lugar de trabajo` (str)
- `Proyecto` (str)
- `Descripcion` (str)
- `Primer paso` (str)
- `Rango de tiempo` (int, minutos)
- `Postergaciones` (int) - manejado por otro programa del ecosistema
- `Urgencia` (str: "A", "B" o "C")
- `Deadline` (int, timestamp YYYYMMDDHHMMSS)
- `Tarea Padre` (list[str]) - lista de filenames.json de tareas padres
- `Tarea Hija` (list[str]) - lista de filenames.json de tareas hijas

**Notas:**
- `Primer paso` es el paso mínimo para iniciar la tarea (antipostcrastinación)
- Los timestamps usan formato `YYYYMMDDHHMMSS` (14 dígitos)
- Los campos `Tarea Padre` y `Tarea Hija` son listas que soportan múltiples relaciones
- La sincronización es bidireccional: al asignar un padre/hija, la otra tarea se actualiza automáticamente

### Normalización de campos

Los nombres de campo en `-m` son **case-insensitive** y soportan formas abreviadas:

| Input del usuario | Se interpreta como |
|-------------------|-------------------|
| `nombre`, `NOMBRE`, `Nombre` | `Nombre` |
| `lugar`, `lugardetrabajo` | `Lugar de trabajo` |
| `proyecto` | `Proyecto` |
| `descripcion`, `desc` | `Descripcion` |
| `primerpaso`, `primer_paso` | `Primer paso` |
| `rangodetiempo`, `rango` | `Rango de tiempo` |
| `postergaciones`, `postergar` | `Postergaciones` |
| `urgencia` | `Urgencia` |
| `deadline` | `Deadline` |
| `tareapadre`, `tarea_padre`, `padre` | `Tarea Padre` |
| `tareahija`, `tarea_hija`, `tarea_hijo`, `hija` | `Tarea Hija` |

### Sincronización bidireccional de relaciones

Cuando se asigna o modifica un campo `Tarea Padre` o `Tarea Hija`, la otra tarea se actualiza automáticamente:

- **Asignar padre:** `clatarea B.json -m padre=A.json`
  - En B.json se escribe `"Tarea Padre": ["A.json"]`
  - En A.json se escribe/agrega `"Tarea Hija": ["B.json"]`

- **Asignar hija:** `clatarea A.json -m hija=B.json`
  - En A.json se escribe `"Tarea Hija": ["B.json"]`
  - En B.json se escribe/agrega `"Tarea Padre": ["A.json"]`

- **Desasignar:** usar valor vacío `clatarea B.json -m padre=`
  - Se limpia `"Tarea Padre"` en B.json
  - Se remueve B.json de `"Tarea Hija"` en A.json

- **Múltiples relaciones:** cada tarea puede tener múltiples padres e hijos
  - `clatarea B.json -m padre=A.json` → B tiene padre A
  - `clatarea C.json -m padre=A.json` → C también tiene padre A, y A tiene hijos [B, C]

- **Tarea referenciada inexistente:** se crea automáticamente con un JSON mínimo