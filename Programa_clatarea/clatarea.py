#!/usr/bin/env python3
import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

POOL_DIR = Path.home() / "tareas" / "pool"
CLASIFICADAS_DIR = Path.home() / "tareas" / "clasificadas"
CLASIFICADAS_DIR.mkdir(parents=True, exist_ok=True)

CAMPS_FIJOS = {
    "Nombre",
    "Lugar de trabajo",
    "Proyecto",
    "Descripcion",
    "Primer paso",
    "Rango de tiempo",
    "Postergaciones",
    "Urgencia",
    "Deadline",
    "Tarea Padre",
    "Tarea Hija",
    "completado",
}

URGENCIAS_VALIDAS = {"A", "B", "C"}

CAMPOS_NORMALIZADOS = {cf.lower(): cf for cf in CAMPS_FIJOS}

SINONIMOS = {
    "nombre": "Nombre",
    "lugar": "Lugar de trabajo",
    "lugardetrabajo": "Lugar de trabajo",
    "proyecto": "Proyecto",
    "descripcion": "Descripcion",
    "desc": "Descripcion",
    "primerpaso": "Primer paso",
    "primer_paso": "Primer paso",
    "rangodetiempo": "Rango de tiempo",
    "rango": "Rango de tiempo",
    "postergaciones": "Postergaciones",
    "postergar": "Postergaciones",
    "urgencia": "Urgencia",
    "deadline": "Deadline",
    "tareapadre": "Tarea Padre",
    "tarea_padre": "Tarea Padre",
    "padre": "Tarea Padre",
    "tareahija": "Tarea Hija",
    "tarea_hija": "Tarea Hija",
    "tarea_hijo": "Tarea Hija",
    "hija": "Tarea Hija",
    "hecho": "completado",
    "lista": "completado",
}


def normalizar_campo(campo):
    clave = campo.lower().strip()
    if clave in CAMPOS_NORMALIZADOS:
        return CAMPOS_NORMALIZADOS[clave]
    return SINONIMOS.get(clave, campo)


def parsear_mods(args_mods):
    mods = {}
    for par in args_mods:
        if "=" not in par:
            raise ValueError(f"Formato invalido en '-m {par}': esperado CAMPO=VALOR")
        campo, _, valor = par.partition("=")
        campo = normalizar_campo(campo.strip())
        valor = valor.strip()
        if campo == "Tarea Padre" or campo == "Tarea Hija":
            if not valor.endswith(".json"):
                valor += ".json"
        if campo == "completado":
            v = valor.lower()
            if v in ("true", "1", "si", "sí", "yes"):
                valor = True
            elif v in ("false", "0", "no"):
                valor = False
            else:
                raise ValueError(
                    f"Valor invalido para 'completado': '{valor}'. Usar true o false"
                )
        mods[campo] = valor
    return mods


def validar_campos(mods):
    for campo in mods:
        if campo not in CAMPS_FIJOS:
            raise ValueError(f"Campo desconocido: '{campo}'. Campos validos: {', '.join(sorted(CAMPS_FIJOS))}")
    if "Urgencia" in mods and mods["Urgencia"] not in URGENCIAS_VALIDAS:
        raise ValueError(f"Urgencia invalida: '{mods['Urgencia']}'. Valores validos: {URGENCIAS_VALIDAS}")
    if "completado" in mods and not isinstance(mods["completado"], bool):
        raise ValueError("'completado' debe ser true o false")


def generar_timestamp_base():
    return datetime.now().strftime("%Y%m%d%H%M%S")


def generar_nombre_archivo(timestamp_base):
    nombre = f"{timestamp_base}.json"
    if not (CLASIFICADAS_DIR / nombre).exists():
        return nombre
    for sufijo in "bcdefghijklmnopqrstuvwxyz":
        nombre = f"{timestamp_base}{sufijo}.json"
        if not (CLASIFICADAS_DIR / nombre).exists():
            return nombre
    raise RuntimeError("No se pudo generar nombre de archivo unico")


def leer_desde_txt(nombre_txt):
    ruta_txt = POOL_DIR / nombre_txt
    if not ruta_txt.exists():
        raise FileNotFoundError(f"Error: Archivo no encontrado en {POOL_DIR}")
    with open(ruta_txt, "r", encoding="utf-8") as f:
        contenido = f.read().strip()
    if not contenido:
        raise ValueError(f"Error: El archivo '{nombre_txt}' esta vacio")
    return contenido


def cargar_tarea(nombre_archivo):
    ruta = CLASIFICADAS_DIR / nombre_archivo
    if not ruta.exists():
        raise FileNotFoundError(f"Error: Archivo no encontrado en {CLASIFICADAS_DIR}")
    with open(ruta, "r", encoding="utf-8") as f:
        return json.load(f)


def guardar_tarea(nombre_archivo, datos):
    ruta = CLASIFICADAS_DIR / nombre_archivo
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=4)


def main():
    parser = argparse.ArgumentParser(
        prog="clatarea",
        description="Clasifica tareas desde .txt (pool/) o crea/modifica tareas en ~/tareas/clasificadas/.",
        epilog="""
Campos validos:
  Nombre, Lugar de trabajo, Proyecto, Descripcion, Primer paso,
  Rango de tiempo, Postergaciones, Urgencia (A|B|C),
  Deadline (YYYYMMDDHHMMSS), Tarea Padre, Tarea Hija,
  completado (true/false)
""",
    )
    parser.add_argument(
        "archivo",
        nargs="?",
        help="Archivo .txt (de ~/tareas/pool/) o .json existente (en ~/tareas/clasificadas/)",
    )
    parser.add_argument(
        "-n",
        "--name",
        metavar="NOMBRE",
        help="Nombre de la nueva tarea (crea archivo si no existe)",
    )
    parser.add_argument(
        "-m",
        "--mod",
        action="append",
        metavar="CAMPO=VALOR",
        help="Par CAMPO=VALOR a modificar/agregar (usar -m varias veces para varios campos)",
    )

    args = parser.parse_args()

    if not args.archivo and not args.name:
        parser.error("Se requiere 'archivo' o '-n/--name'")

    if args.archivo and args.name:
        parser.error("No se puede usar 'archivo' y '-n/--name' juntos")

    if args.archivo and args.archivo.endswith(".json") and not args.mod:
        parser.error("Para modificar una tarea existente se requiere al menos '-m CAMPO=VALOR'")

    try:
        mods = parsear_mods(args.mod) if args.mod else {}
        validar_campos(mods)

        if args.archivo:
            if args.archivo.endswith(".json"):
                datos = cargar_tarea(args.archivo)
                datos.update(mods)
                guardar_tarea(args.archivo, datos)
                print(f"Tarea '{args.archivo}' modificada")
            else:
                nombre_txt = args.archivo if args.archivo.endswith(".txt") else f"{args.archivo}.txt"
                contenido_txt = leer_desde_txt(nombre_txt)
                nombre_base = Path(nombre_txt).stem
                ts = generar_timestamp_base()
                nombre_json = generar_nombre_archivo(ts)
                datos = {"Nombre": nombre_base, "Descripcion": contenido_txt}
                datos.update(mods)
                guardar_tarea(nombre_json, datos)
                (POOL_DIR / nombre_txt).unlink()
                print(f"Tarea '{nombre_json}' creada desde '{nombre_txt}'")
        else:
            ts = generar_timestamp_base()
            nombre_json = generar_nombre_archivo(ts)
            datos = {"Nombre": args.name}
            datos.update(mods)
            guardar_tarea(nombre_json, datos)
            print(f"Tarea '{nombre_json}' creada")

    except FileNotFoundError as e:
        print(e, file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error inesperado: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
