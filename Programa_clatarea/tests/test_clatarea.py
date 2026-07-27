import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import clatarea


class TestParsearMods(unittest.TestCase):
    def test_mod_simple(self):
        mods = clatarea.parsear_mods(["lugar=Casa"])
        self.assertEqual(mods, {"Lugar de trabajo": "Casa"})

    def test_mod_con_espacios(self):
        mods = clatarea.parsear_mods(["proyecto=Instalar aire"])
        self.assertEqual(mods, {"Proyecto": "Instalar aire"})

    def test_multiples_mods(self):
        mods = clatarea.parsear_mods(["lugar=Casa", "proyecto=Limpiar", "descripcion=Algo"])
        self.assertEqual(mods, {"Lugar de trabajo": "Casa", "Proyecto": "Limpiar", "Descripcion": "Algo"})

    def test_mod_tarea_padre(self):
        mods = clatarea.parsear_mods(["Tarea Padre=20260727183901"])
        self.assertEqual(mods, {"Tarea Padre": "20260727183901.json"})

    def test_mod_tarea_hiia_sin_json(self):
        mods = clatarea.parsear_mods(["Tarea Hija=20260727183900"])
        self.assertEqual(mods, {"Tarea Hija": "20260727183900.json"})

    def test_mod_tarea_con_json(self):
        mods = clatarea.parsear_mods(["Tarea Padre=20260727183901.json"])
        self.assertEqual(mods, {"Tarea Padre": "20260727183901.json"})

    def test_mod_formato_invalido(self):
        with self.assertRaises(ValueError) as ctx:
            clatarea.parsear_mods(["lugar"])
        self.assertIn("Formato invalido", str(ctx.exception))


class TestValidarCampos(unittest.TestCase):
    def test_campo_valido(self):
        clatarea.validar_campos({"Nombre": "Prueba"})

    def test_campo_desconocido(self):
        with self.assertRaises(ValueError) as ctx:
            clatarea.validar_campos({"CampoInvalido": "Valor"})
        self.assertIn("Campo desconocido", str(ctx.exception))

    def test_urgencia_valida(self):
        clatarea.validar_campos({"Urgencia": "A"})
        clatarea.validar_campos({"Urgencia": "B"})
        clatarea.validar_campos({"Urgencia": "C"})

    def test_urgencia_invalida(self):
        with self.assertRaises(ValueError) as ctx:
            clatarea.validar_campos({"Urgencia": "X"})
        self.assertIn("Urgencia invalida", str(ctx.exception))


class TestGenerarTimestamp(unittest.TestCase):
    def test_timestamp_formato(self):
        ts = clatarea.generar_timestamp_base()
        self.assertEqual(len(ts), 14)
        self.assertTrue(ts.isdigit())


class TestGenerarNombreArchivo(unittest.TestCase):
    def setUp(self):
        self.clasificadas = Path(tempfile.mkdtemp())
        self.original_clasificadas = clatarea.CLASIFICADAS_DIR
        clatarea.CLASIFICADAS_DIR = self.clasificadas

    def tearDown(self):
        clatarea.CLASIFICADAS_DIR = self.original_clasificadas

    def test_nombre_sin_colision(self):
        nombre = clatarea.generar_nombre_archivo("20260727183902")
        self.assertEqual(nombre, "20260727183902.json")

    def test_nombre_con_colision(self):
        (self.clasificadas / "20260727183902.json").touch()
        nombre = clatarea.generar_nombre_archivo("20260727183902")
        self.assertEqual(nombre, "20260727183902b.json")

    def test_nombre_con_colision_multiple(self):
        for sufijo in ["", "b", "c"]:
            (self.clasificadas / f"20260727183902{sufijo}.json").touch()
        nombre = clatarea.generar_nombre_archivo("20260727183902")
        self.assertEqual(nombre, "20260727183902d.json")


class TestLeerDesdeTxt(unittest.TestCase):
    def setUp(self):
        self.pool = Path(tempfile.mkdtemp())
        self.original_pool = clatarea.POOL_DIR
        clatarea.POOL_DIR = self.pool

    def tearDown(self):
        clatarea.POOL_DIR = self.original_pool

    def test_leer_txt_existe(self):
        (self.pool / "mi-tarea.txt").write_text("Barrer el piso")
        resultado = clatarea.leer_desde_txt("mi-tarea.txt")
        self.assertEqual(resultado, "Barrer el piso")

    def test_leer_txt_no_existe(self):
        with self.assertRaises(FileNotFoundError) as ctx:
            clatarea.leer_desde_txt("no-existe.txt")
        self.assertIn("no encontrado", str(ctx.exception))

    def test_leer_txt_vacio(self):
        (self.pool / "vacio.txt").write_text("")
        with self.assertRaises(ValueError) as ctx:
            clatarea.leer_desde_txt("vacio.txt")
        self.assertIn("esta vacio", str(ctx.exception))


class TestGuardarCargarTarea(unittest.TestCase):
    def setUp(self):
        self.clasificadas = Path(tempfile.mkdtemp())
        self.original_clasificadas = clatarea.CLASIFICADAS_DIR
        clatarea.CLASIFICADAS_DIR = self.clasificadas

    def tearDown(self):
        clatarea.CLASIFICADAS_DIR = self.original_clasificadas

    def test_guardar_y_cargar(self):
        datos = {"Nombre": "Prueba", "Lugar de trabajo": "Casa"}
        clatarea.guardar_tarea("20260727183902.json", datos)
        resultado = clatarea.cargar_tarea("20260727183902.json")
        self.assertEqual(resultado, datos)

    def test_cargar_no_existe(self):
        with self.assertRaises(FileNotFoundError):
            clatarea.cargar_tarea("no-existe.json")


if __name__ == "__main__":
    unittest.main()
