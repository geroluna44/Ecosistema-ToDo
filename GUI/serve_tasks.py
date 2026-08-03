#!/usr/bin/env python3
import http.server
import socketserver
import os
import json
import re
import subprocess
import sys
from urllib.parse import unquote, urlparse, parse_qs

TASKS_DIR = os.path.expanduser("~/tareas/clasificadas")
POOL_DIR = os.path.expanduser("~/tareas/pool")
PAPELERA_DIR = os.path.expanduser("~/tareas/papelera")
DEBUG_TASKS_DIR = os.path.expanduser("~/tareas/debug/clasificadas")
DEBUG_POOL_DIR = os.path.expanduser("~/tareas/debug/pool")
DEBUG_PAPELERA_DIR = os.path.expanduser("~/tareas/debug/papelera")
PORT = 8080

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
TRASHTAREA = os.path.join(THIS_DIR, "..", "Programa_trashtarea", "trashtarea")
CLATAREA = os.path.join(THIS_DIR, "..", "Programa_clatarea", "clatarea.py")

class TasksHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=TASKS_DIR, **kwargs)

    def do_GET(self):
        path = unquote(self.path)

        if path.startswith("/debug-papelera/"):
            relative = path[len("/debug-papelera/"):]
            self.handle_debug_papelera_get(relative)
        elif path.startswith("/debug/pool/"):
            relative = path[len("/debug/pool/"):]
            self.handle_debug_pool_get(relative)
        elif path.startswith("/debug/"):
            relative = path[len("/debug/"):]
            if relative and not relative.endswith("/"):
                self.handle_debug_file_get(relative)
            else:
                self.handle_debug_list()
        elif path.startswith("/papelera/"):
            relative = path[len("/papelera/"):]
            self.handle_papelera_get(relative)
        elif path.startswith("/pool/"):
            relative = path[len("/pool/"):]
            self.handle_pool_get(relative)
        elif path.startswith("/tareas/"):
            relative = path[len("/tareas/"):]
            if relative and not relative.endswith("/"):
                self.handle_clasificada_file_get(relative)
            else:
                super().do_GET()
        else:
            super().do_GET()

    def handle_papelera_get(self, relative):
        import urllib.parse
        from http.server import SimpleHTTPRequestHandler

        if not relative or relative == "/":
            self.list_directory_html(PAPELERA_DIR)
            return

        filename = urllib.parse.unquote(relative)
        filepath = os.path.join(PAPELERA_DIR, filename)

        if not os.path.realpath(filepath).startswith(os.path.realpath(PAPELERA_DIR)):
            self.send_error(403, "Forbidden")
            return

        if not os.path.isfile(filepath):
            self.send_error(404, "Not found")
            return

        try:
            with open(filepath, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, str(e))

    def handle_pool_get(self, relative):
        if not relative or relative == "/":
            self.list_pool_json()
            return

        import urllib.parse
        filename = urllib.parse.unquote(relative)
        if not filename.endswith(".txt"):
            self.send_error(400, "Pool files must be .txt")
            return

        filepath = os.path.join(POOL_DIR, filename)
        if not os.path.realpath(filepath).startswith(os.path.realpath(POOL_DIR)):
            self.send_error(403, "Forbidden")
            return
        if not os.path.isfile(filepath):
            self.send_error(404, "Not found")
            return

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            payload = json.dumps({"filename": filename, "content": content}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(payload)
        except Exception as e:
            self.send_error(500, str(e))

    def handle_debug_list(self):
        self.list_directory_html(DEBUG_TASKS_DIR)

    def handle_debug_file_get(self, relative):
        import urllib.parse
        filename = urllib.parse.unquote(relative)
        filepath = os.path.join(DEBUG_TASKS_DIR, filename)
        if not os.path.realpath(filepath).startswith(os.path.realpath(DEBUG_TASKS_DIR)):
            self.send_error(403, "Forbidden")
            return
        if not os.path.isfile(filepath):
            self.send_error(404, "Not found")
            return
        try:
            with open(filepath, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, str(e))

    def handle_debug_pool_get(self, relative):
        if not relative or relative == "/":
            self.list_debug_pool_json()
            return
        import urllib.parse
        filename = urllib.parse.unquote(relative)
        if not filename.endswith(".txt"):
            self.send_error(400, "Pool files must be .txt")
            return
        filepath = os.path.join(DEBUG_POOL_DIR, filename)
        if not os.path.realpath(filepath).startswith(os.path.realpath(DEBUG_POOL_DIR)):
            self.send_error(403, "Forbidden")
            return
        if not os.path.isfile(filepath):
            self.send_error(404, "Not found")
            return
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            payload = json.dumps({"filename": filename, "content": content}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(payload)
        except Exception as e:
            self.send_error(500, str(e))

    def list_debug_pool_json(self):
        try:
            entries = sorted(
                f for f in os.listdir(DEBUG_POOL_DIR)
                if os.path.isfile(os.path.join(DEBUG_POOL_DIR, f)) and f.endswith(".txt")
            )
            items = []
            for name in entries:
                filepath = os.path.join(DEBUG_POOL_DIR, name)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                except OSError:
                    content = ""
                items.append({"filename": name, "content": content})
            payload = json.dumps(items).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(payload)
        except OSError as e:
            self.send_error(500, str(e))

    def handle_debug_papelera_get(self, relative):
        import urllib.parse
        if not relative or relative == "/":
            self.list_directory_html(DEBUG_PAPELERA_DIR)
            return
        filename = urllib.parse.unquote(relative)
        filepath = os.path.join(DEBUG_PAPELERA_DIR, filename)
        if not os.path.realpath(filepath).startswith(os.path.realpath(DEBUG_PAPELERA_DIR)):
            self.send_error(403, "Forbidden")
            return
        if not os.path.isfile(filepath):
            self.send_error(404, "Not found")
            return
        try:
            with open(filepath, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, str(e))

    def handle_clasificada_file_get(self, relative):
        import urllib.parse

        filename = urllib.parse.unquote(relative)
        filepath = os.path.join(TASKS_DIR, filename)

        if not os.path.realpath(filepath).startswith(os.path.realpath(TASKS_DIR)):
            self.send_error(403, "Forbidden")
            return

        if not os.path.isfile(filepath):
            self.send_error(404, "Not found")
            return

        try:
            with open(filepath, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, str(e))

    def list_pool_json(self):
        try:
            entries = sorted(
                f for f in os.listdir(POOL_DIR)
                if os.path.isfile(os.path.join(POOL_DIR, f)) and f.endswith(".txt")
            )
            items = []
            for name in entries:
                filepath = os.path.join(POOL_DIR, name)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                except OSError:
                    content = ""
                items.append({"filename": name, "content": content})

            payload = json.dumps(items).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(payload)
        except OSError as e:
            self.send_error(500, str(e))

    def list_directory_html(self, directory):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()

        try:
            entries = sorted(
                f for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f))
            )
        except OSError:
            entries = []

        self.wfile.write(b"<!DOCTYPE html>\n<html>\n<body>\n")
        for name in entries:
            encoded = name.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
            self.wfile.write(f'<a href="{encoded}">{encoded}</a><br>\n'.encode("utf-8"))
        self.wfile.write(b"</body>\n</html>\n")

    def do_PUT(self):
        raw = unquote(self.path.strip("/"))
        if raw.startswith("debug/"):
            raw = raw[len("debug/"):]
            full_path = os.path.join(DEBUG_TASKS_DIR, raw)
            base_dir = DEBUG_TASKS_DIR
        elif raw.startswith("tareas/"):
            raw = raw[len("tareas/"):]
            full_path = os.path.join(TASKS_DIR, raw)
            base_dir = TASKS_DIR
        else:
            self.send_error(404, "Not found")
            return

        if not os.path.realpath(full_path).startswith(os.path.realpath(base_dir)):
            self.send_error(403, "Forbidden")
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            json_data = json.loads(body.decode("utf-8"))

            with open(full_path, "w", encoding="utf-8") as f:
                json.dump(json_data, f, indent=4, ensure_ascii=False)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        except json.JSONDecodeError as e:
            self.send_error(400, f"Invalid JSON: {e}")
        except Exception as e:
            self.send_error(500, str(e))

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path.strip("/"))
        qs = parse_qs(parsed.query)

        if path.startswith("debug-papelera/"):
            filename = path[len("debug-papelera/"):]
            if filename:
                self.handle_debug_permanent_delete(filename)
            else:
                self.handle_debug_empty_trash()
        elif path.startswith("debug/tareas/") or path.startswith("debug/"):
            remainder = path[len("debug/"):]
            if remainder.startswith("tareas/"):
                filename = remainder[len("tareas/"):]
            else:
                filename = remainder
            if filename:
                self.handle_debug_trash_task(filename)
            else:
                self.send_error(404, "Not found")
        elif path.startswith("papelera/"):
            filename = path[len("papelera/"):]
            if filename:
                self.handle_permanent_delete(filename)
            else:
                self.handle_empty_trash()
        elif path.startswith("tareas/"):
            filename = path[len("tareas/"):]
            if filename.startswith("papelera/"):
                self.handle_permanent_delete(filename[len("papelera/"):])
            else:
                self.handle_trash_task(filename)
        elif (path == "tareas" or path == "") and "proyecto" in qs:
            self.handle_trash_project(qs["proyecto"][0])
        elif path == "papelera":
            self.handle_empty_trash()
        else:
            self.send_error(404, "Not found")

    def handle_trash_task(self, filename):
        if not filename.endswith(".json"):
            filename += ".json"
        self._run_trashtarea([filename])

    def handle_trash_project(self, proyecto):
        self._run_trashtarea(["-p", proyecto])

    def handle_empty_trash(self):
        self._run_trashtarea(["-e", "-f"])

    def handle_permanent_delete(self, filename):
        if not filename.endswith(".json"):
            filename += ".json"
        self._run_trashtarea(["-d", filename])

    def _run_trashtarea(self, args):
        try:
            result = subprocess.run(
                [sys.executable, TRASHTAREA] + args,
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "message": result.stdout.strip()}).encode())
            else:
                self.send_error(500, result.stderr.strip())
        except subprocess.TimeoutExpired:
            self.send_error(500, "trashtarea timed out")
        except Exception as e:
            self.send_error(500, str(e))

    def handle_debug_trash_task(self, filename):
        if not filename.endswith(".json"):
            filename += ".json"
        src = os.path.join(DEBUG_TASKS_DIR, filename)
        if not os.path.isfile(src):
            self.send_error(404, "Not found in debug clasificadas")
            return
        os.makedirs(DEBUG_PAPELERA_DIR, exist_ok=True)
        dst = os.path.join(DEBUG_PAPELERA_DIR, filename)
        if os.path.exists(dst):
            base = filename.replace(".json", "")
            n = 2
            while os.path.exists(os.path.join(DEBUG_PAPELERA_DIR, f"{base}-{n}.json")):
                n += 1
            dst = os.path.join(DEBUG_PAPELERA_DIR, f"{base}-{n}.json")
        try:
            os.rename(src, dst)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        except Exception as e:
            self.send_error(500, str(e))

    def handle_debug_permanent_delete(self, filename):
        if not filename.endswith(".json"):
            filename += ".json"
        filepath = os.path.join(DEBUG_PAPELERA_DIR, filename)
        if not os.path.realpath(filepath).startswith(os.path.realpath(DEBUG_PAPELERA_DIR)):
            self.send_error(403, "Forbidden")
            return
        if not os.path.isfile(filepath):
            self.send_error(404, "Not found")
            return
        try:
            os.remove(filepath)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        except Exception as e:
            self.send_error(500, str(e))

    def handle_debug_empty_trash(self):
        try:
            if os.path.isdir(DEBUG_PAPELERA_DIR):
                for f in os.listdir(DEBUG_PAPELERA_DIR):
                    fp = os.path.join(DEBUG_PAPELERA_DIR, f)
                    if os.path.isfile(fp):
                        os.remove(fp)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        except Exception as e:
            self.send_error(500, str(e))

    def handle_debug_restore_task(self, path):
        try:
            filename = path[len("debug-papelera/"):-len("/restore")]
            src = os.path.join(DEBUG_PAPELERA_DIR, filename)
            if not os.path.realpath(src).startswith(os.path.realpath(DEBUG_PAPELERA_DIR)):
                self.send_error(403, "Forbidden")
                return
            if not os.path.isfile(src):
                self.send_error(404, "File not found in debug papelera")
                return
            dst = os.path.join(DEBUG_TASKS_DIR, filename)
            if os.path.exists(dst):
                base = filename.replace(".json", "")
                n = 2
                while os.path.exists(os.path.join(DEBUG_TASKS_DIR, f"{base}-{n}.json")):
                    n += 1
                dst = os.path.join(DEBUG_TASKS_DIR, f"{base}-{n}.json")
            os.rename(src, dst)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        except Exception as e:
            self.send_error(500, str(e))

    def do_POST(self):
        path = unquote(self.path.strip("/"))
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)

        if path.startswith("debug-papelera/") and path.endswith("/restore"):
            self.handle_debug_restore_task(path)
        elif path.startswith("debug/pool/") and path.endswith("/clasificar"):
            filename = path[len("debug/pool/"):-len("/clasificar")]
            self.handle_debug_clasificar_pool_task(filename)
        elif path.startswith("debug/pool"):
            self.handle_debug_create_pool_task(path)
        elif path == "pool" or path == "pool/" or (path.startswith("pool/") and not path.endswith("/clasificar")):
            self.handle_create_pool_task(path)
        elif path.startswith("pool/") and path.endswith("/clasificar"):
            filename = path[len("pool/"):-len("/clasificar")]
            self.handle_clasificar_pool_task(filename)
        elif path.startswith("papelera/") and path.endswith("/restore"):
            if qs.get("proyecto"):
                self.handle_restore_project(qs["proyecto"][0])
            else:
                self.handle_restore_task(path)
        elif path == "papelera/restore/project":
            self.handle_restore_project(qs.get("proyecto", [""])[0])
        elif path == "papelera/empty":
            self.handle_empty_trash()
        else:
            self.handle_create_clasificada_task(path)

    def handle_restore_task(self, path):
        try:
            filename = path[len("papelera/"):-len("/restore")]
            src = os.path.join(PAPELERA_DIR, filename)

            if not os.path.realpath(src).startswith(os.path.realpath(PAPELERA_DIR)):
                self.send_error(403, "Forbidden")
                return

            if not os.path.isfile(src):
                self.send_error(404, "File not found in papelera")
                return

            dst = os.path.join(TASKS_DIR, filename)
            os.rename(src, dst)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        except Exception as e:
            self.send_error(500, str(e))

    def handle_create_pool_task(self, path):
        os.makedirs(POOL_DIR, exist_ok=True)
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))

            nombre = data.get("nombre", "sin-nombre")
            descripcion = data.get("descripcion", "")

            slug = self.slugify(nombre)
            filename = self.find_available_filename(slug, POOL_DIR, ".txt")

            filepath = os.path.join(POOL_DIR, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                if descripcion:
                    f.write(f"{nombre}\n\n{descripcion}")
                else:
                    f.write(nombre)

            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "filename": filename}).encode())
        except Exception as e:
            self.send_error(500, str(e))

    def handle_create_clasificada_task(self, path):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))

            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            base = timestamp
            filename = f"{base}.json"
            filepath = os.path.join(TASKS_DIR, filename)
            n = 2
            while os.path.exists(filepath):
                filename = f"{base}-{n}.json"
                filepath = os.path.join(TASKS_DIR, filename)
                n += 1

            tarea = {
                "Nombre": data.get("nombre", "Sin nombre"),
                "Lugar de trabajo": data.get("lugar", ""),
                "Proyecto": data.get("proyecto", ""),
                "Descripcion": data.get("descripcion", ""),
                "Primer paso": data.get("primer_paso", ""),
                "Rango de tiempo": data.get("rango_tiempo", 30),
                "Postergaciones": 0,
                "Urgencia": data.get("urgencia", "C"),
                "Deadline": data.get("deadline", 0),
                "Tarea Padre": data.get("tarea_padre", ""),
                "Tarea Hija": data.get("tarea_hija", ""),
            }

            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(tarea, f, indent=4, ensure_ascii=False)

            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "filename": filename}).encode())
        except Exception as e:
            self.send_error(500, str(e))

    def handle_clasificar_pool_task(self, filename):
        try:
            if not filename.endswith(".txt"):
                filename += ".txt"
            filepath = os.path.join(POOL_DIR, filename)

            if not os.path.realpath(filepath).startswith(os.path.realpath(POOL_DIR)):
                self.send_error(403, "Forbidden")
                return
            if not os.path.isfile(filepath):
                self.send_error(404, "Pool file not found")
                return

            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))

            args = [sys.executable, CLATAREA, filename]
            field_map = {
                "lugar": "Lugar de trabajo",
                "proyecto": "Proyecto",
                "descripcion": "Descripcion",
                "primer_paso": "Primer paso",
                "rango_tiempo": "Rango de tiempo",
                "urgencia": "Urgencia",
                "deadline": "Deadline",
                "tarea_padre": "Tarea Padre",
                "tarea_hija": "Tarea Hija",
            }
            for key, value in data.items():
                if key == "nombre":
                    continue
                if value is None or value == "":
                    continue
                campo = field_map.get(key, key)
                args.extend(["-m", f"{campo}={value}"])

            result = subprocess.run(
                args, capture_output=True, text=True, timeout=30
            )
            if result.returncode != 0:
                self.send_error(500, result.stderr.strip() or "clatarea failed")
                return

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "message": result.stdout.strip(),
            }).encode())
        except subprocess.TimeoutExpired:
            self.send_error(500, "clatarea timed out")
        except Exception as e:
            self.send_error(500, str(e))

    def handle_debug_create_pool_task(self, path):
        os.makedirs(DEBUG_POOL_DIR, exist_ok=True)
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))
            nombre = data.get("nombre", "sin-nombre")
            descripcion = data.get("descripcion", "")
            slug = self.slugify(nombre)
            filename = self.find_available_filename(slug, DEBUG_POOL_DIR, ".txt")
            filepath = os.path.join(DEBUG_POOL_DIR, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                if descripcion:
                    f.write(f"{nombre}\n\n{descripcion}")
                else:
                    f.write(nombre)
            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "filename": filename}).encode())
        except Exception as e:
            self.send_error(500, str(e))

    def handle_debug_clasificar_pool_task(self, filename):
        try:
            if not filename.endswith(".txt"):
                filename += ".txt"
            filepath = os.path.join(DEBUG_POOL_DIR, filename)
            if not os.path.realpath(filepath).startswith(os.path.realpath(DEBUG_POOL_DIR)):
                self.send_error(403, "Forbidden")
                return
            if not os.path.isfile(filepath):
                self.send_error(404, "Debug pool file not found")
                return
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))

            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            base = timestamp
            out_filename = f"{base}.json"
            out_filepath = os.path.join(DEBUG_TASKS_DIR, out_filename)
            n = 2
            while os.path.exists(out_filepath):
                out_filename = f"{base}-{n}.json"
                out_filepath = os.path.join(DEBUG_TASKS_DIR, out_filename)
                n += 1

            nombre = data.get("nombre", nombre.replace(".txt", "").replace("-", " ").title())
            tarea = {
                "Nombre": nombre,
                "Lugar de trabajo": data.get("lugar", ""),
                "Proyecto": data.get("proyecto", ""),
                "Descripcion": data.get("descripcion", ""),
                "Primer paso": data.get("primer_paso", ""),
                "Rango de tiempo": data.get("rango_tiempo", 30),
                "Postergaciones": 0,
                "Urgencia": data.get("urgencia", "C"),
                "Deadline": data.get("deadline", 0),
                "Tarea Padre": data.get("tarea_padre", ""),
                "Tarea Hija": data.get("tarea_hija", ""),
            }
            with open(out_filepath, "w", encoding="utf-8") as f:
                json.dump(tarea, f, indent=4, ensure_ascii=False)

            os.remove(filepath)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "message": f"Clasificada como {out_filename}",
            }).encode())
        except Exception as e:
            self.send_error(500, str(e))

    def slugify(self, text):
        import unicodedata
        text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
        text = re.sub(r"[^\w\s-]", "", text).strip().lower()
        text = re.sub(r"[-\s]+", "-", text)
        return text

    def find_available_filename(self, slug, directory, extension):
        filename = f"{slug}{extension}"
        filepath = os.path.join(directory, filename)
        if not os.path.exists(filepath):
            return filename

        counter = 2
        while True:
            filename = f"{slug}-{counter}{extension}"
            filepath = os.path.join(directory, filename)
            if not os.path.exists(filepath):
                return filename
            counter += 1

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    print(f"Serving {TASKS_DIR}")
    print(f"Serving pool at {POOL_DIR}")
    print(f"Serving papelera at {PAPELERA_DIR}")
    print(f"Serving debug at {DEBUG_TASKS_DIR}")
    print(f"http://localhost:{PORT}/")
    print("Press Ctrl+C to stop")

    os.makedirs(POOL_DIR, exist_ok=True)
    os.makedirs(PAPELERA_DIR, exist_ok=True)
    os.makedirs(DEBUG_TASKS_DIR, exist_ok=True)
    os.makedirs(DEBUG_POOL_DIR, exist_ok=True)
    os.makedirs(DEBUG_PAPELERA_DIR, exist_ok=True)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), TasksHandler) as httpd:
        httpd.serve_forever()