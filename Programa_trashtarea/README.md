# trashtarea

CLI minimalista (Python 3, solo stdlib) para gestionar la papelera de tareas
en `~/tareas/papelera/`. Forma parte de un ecosistema de programas UNIX-style
para gestion de tareas.

## Uso

```
trashtarea ARCHIVO.json [ARCHIVO2.json ...]
trashtarea -p PROYECTO
trashtarea -l
trashtarea -r ARCHIVO.json [ARCHIVO2.json ...]
trashtarea -r -p PROYECTO
trashtarea -d ARCHIVO.json [ARCHIVO2.json ...]
trashtarea -e
```

### Comandos

| Comando | Descripcion |
|---------|-------------|
| `ARCHIVO.json ...` | Mueve tarea(s) de `clasificadas/` a `papelera/` |
| `-p PROYECTO` | Mueve todas las tareas de un proyecto a la papelera |
| `-l, --list` | Lista el contenido de la papelera |
| `-r, --restore ARCHIVO.json ...` | Restaura tarea(s) de `papelera/` a `clasificadas/` |
| `-r -p PROYECTO` | Restaura todas las tareas de un proyecto |
| `-d, --delete ARCHIVO.json ...` | Elimina permanentemente tarea(s) de la papelera |
| `-e, --empty` | Vacia la papelera permanentemente (pide confirmacion) |
| `-e -f` | Vacia la papelera sin confirmacion |
| `-h, --help` | Muestra la ayuda |

### Exit codes

| Codigo | Significado |
|--------|-------------|
| 0 | Exito |
| 1 | Error de I/O |
| 2 | Uso invalido |
| 130 | Cancelado (Ctrl+C) |

## Comportamiento

- Los archivos `.json` se leen de `~/tareas/clasificadas/` o `~/tareas/papelera/`.
- Al mover a papelera, si ya existe un archivo con el mismo nombre, se anade
  sufijo `-2`, `-3`, etc.
- Al restaurar, si ya existe en clasificadas, tambien se anade sufijo.
- `-p` busca todas las tareas cuyo campo `Proyecto` coincida exactamente.
- `-e` sin `-f` pide confirmacion por stdin.

## Integracion con el ecosistema

- `addtarea` crea tareas `.txt` en `~/tareas/pool/`
- `clatarea` clasifica `.txt` a `.json` en `~/tareas/clasificadas/`
- `trashtarea` mueve/restaura/elimina tareas de `~/tareas/papelera/`
- La GUI (React) usa `trashtarea` a traves del servidor HTTP (`serve_tasks.py`)

## Instalacion

```sh
chmod +x trashtarea
mkdir -p ~/.local/bin
cp trashtarea ~/.local/bin/

# Asegurate de tener ~/.local/bin en el PATH:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

trashtarea --help
```
