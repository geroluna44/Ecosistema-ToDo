# Programa trashtarea

Programa que funciona dentro de un ecosistema de gestion de tareas, siguiendo
la filosofia KISS y UNIX. Ejecutable en CLI, escrito en Python. Disenado para
correr en una Raspi 3b con Hermes - ultra liviano.

## Recursos
- Python 3
- Linux

## Funcionalidad

### CLI

```
trashtarea [ARCHIVO.json ... | -p PROYECTO | -l | -r ARCHIVO.json ... | -d ARCHIVO.json ... | -e]
```

**Formas de uso:**

1. **Mover tarea(s) a la papelera:**
   ```
   trashtarea 20260727183902.json
   trashtarea 20260727183902.json 20260727183903.json
   ```
   Mueve los archivos `.json` de `~/tareas/clasificadas/` a `~/tareas/papelera/`.

2. **Mover proyecto entero a la papelera:**
   ```
   trashtarea -p "Proyecto X"
   ```
   Busca todas las tareas con `Proyecto == "Proyecto X"` y las mueve a la papelera.

3. **Listar papelera:**
   ```
   trashtarea -l
   ```
   Muestra nombre de archivo y `Nombre` de cada tarea en la papelera.

4. **Restaurar tarea(s) desde la papelera:**
   ```
   trashtarea -r 20260727183902.json
   trashtarea -r 20260727183902.json 20260727183903.json
   ```
   Mueve los archivos de `papelera/` de vuelta a `clasificadas/`.

5. **Restaurar proyecto entero:**
   ```
   trashtarea -r -p "Proyecto X"
   ```

6. **Eliminar permanentemente:**
   ```
   trashtarea -d 20260727183902.json
   ```
   Elimina archivos de la papelera sin posibilidad de recuperacion.

7. **Vaciar papelera:**
   ```
   trashtarea -e
   trashtarea -e -f    # Sin confirmacion
   ```

**Flags:**

| Flag | Descripcion |
|------|-------------|
| `-p, --proyecto PROYECTO` | Operar sobre todas las tareas de un proyecto |
| `-l, --list` | Listar contenido de la papelera |
| `-r, --restore` | Restaurar archivo(s) o proyecto desde la papelera |
| `-d, --delete` | Eliminar permanentemente archivo(s) de la papelera |
| `-e, --empty` | Vaciar la papelera permanentemente |
| `-f, --force` | Saltar confirmacion al vaciar la papelera |
| `-h, --help` | Muestra esta ayuda |

### Comportamiento

- Los `.json` se leen de `~/tareas/clasificadas/` y se mueven a `~/tareas/papelera/`.
- Si el archivo destino ya existe, se anade sufijo `-2`, `-3`, etc.
- `-p` lee el contenido JSON de cada archivo y compara el campo `Proyecto`.
- `-r` mueve archivos de `papelera/` a `clasificadas/`.
- `-d` elimina archivos permanentemente (no van a ningun otro lado).
- `-e` elimina todos los archivos `.json` de la papelera.
- `-e` sin `-f` solicita confirmacion por stdin ("si" para confirmar).

### Archivos

- `~/tareas/clasificadas/` - tareas activas (JSON)
- `~/tareas/papelera/` - tareas eliminadas (JSON)
