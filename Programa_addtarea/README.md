# addtarea

CLI minimalista (Python 3, sólo stdlib) para crear tareas en `~/tareas/pool/`.
Forma parte de un ecosistema de programas UNIX-style para gestión de tareas.

## Uso

```
addtarea TITULO
addtarea TITULO "descripcion"
printf "l1\nl2\n\n" | addtarea TITULO
```

Sin descripcion, lee de **stdin** hasta una linea vacia (o EOF).
Imprime en **stdout** la ruta absoluta del archivo creado.

### Opciones

| Flag                  | Descripcion                                              |
| --------------------- | -------------------------------------------------------- |
| `-h`, `--help`        | Muestra la ayuda.                                        |
| `--pool DIR`          | Sobreescribe el directorio destino.                      |
| `TAREAS_POOL=DIR`     | Variable de entorno equivalente al flag anterior.       |

### Exit codes

| Codigo | Significado            |
| ------ | ---------------------- |
| 0      | Exito                  |
| 1      | Error de I/O           |
| 2      | Uso invalido           |
| 130    | Cancelado (Ctrl+C)     |

## Nombre de archivo

- Espacios y tabs se reemplazan por `-`.
- Se colapsan guiones repetidos y se podan al inicio/final.
- Se preservan acentos y la `ñ` (NFC).
- Caracteres prohibidos (`/`, `\\`, controles) se eliminan.
- Si el destino ya existe, se prueba `-2`, `-3`, …

## Instalacion en la Raspi

```sh
chmod +x addtarea
mkdir -p ~/.local/bin
cp addtarea ~/.local/bin/

# Asegurate de tener ~/.local/bin en el PATH:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

addtarea --help
```

## Filosofia

- KISS, UNIX, zero deps (solo `pathlib` y `unicodedata` de la stdlib).
- Pensado para correr en una Raspberry Pi 3B con Hermes.
- Salida en stdout, errores en stderr, exit codes significativos.
- Formato del `.txt`: contenido crudo. El nombre de archivo codifica el titulo;
  los otros programas del ecosistema deberian parsear el nombre, no el contenido.
