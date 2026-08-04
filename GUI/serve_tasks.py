#!/usr/bin/env python3
import http.server
import socketserver
import os
import json
import re
import subprocess
import sys
import unicodedata
from datetime import datetime
from urllib.parse import unquote, urlparse, parse_qs

TASKS_DIR = os.path.expanduser("~/tareas/clasificadas")
POOL_DIR = os.path.expanduser("~/tareas/pool")
PAPELERA_DIR = os.path.expanduser("~/tareas/papelera")
BASE_DIR = os.path.expanduser("~/tareas")
DEBUG_TASKS_DIR = os.path.expanduser("~/tareas/debug/clasificadas")
DEBUG_POOL_DIR = os.path.expanduser("~/tareas/debug/pool")
DEBUG_PAPELERA_DIR = os.path.expanduser("~/tareas/debug/papelera")
DEBUG_BASE_DIR = os.path.expanduser("~/tareas/debug")
PORT = 8080

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
TRASHTAREA = os.path.join(THIS_DIR, "..", "Programa_trashtarea", "trashtarea")
CLATAREA = os.path.join(THIS_DIR, "..", "Programa_clatarea", "clatarea.py")

FIELD_MAP = {
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
        if not relative or relative == "/":
            self.list_directory_html(PAPELERA_DIR)
            return

        filename = unquote(relative)
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

        filename = unquote(relative)
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
        filename = unquote(relative)
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
        filename = unquote(relative)
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
        if not relative or relative == "/":
            self.list_directory_html(DEBUG_PAPELERA_DIR)
            return
        filename = unquote(relative)
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
        filename = unquote(relative)
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

    def _run_clatarea(self, args, tasks_dir=None):
        cmd = [sys.executable, CLATAREA]
        if tasks_dir:
            cmd.extend(["--dir", tasks_dir])
        cmd.extend(args)
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            raise Exception(result.stderr.strip() or "clatarea failed")
        return result.stdout.strip()

    def _normalize_for_diff(self, value):
        if isinstance(value, list):
            return sorted(value) if value else ""
        if isinstance(value, str):
            return value.strip()
        if value is None:
            return ""
        return value

    def _clatarea_field_map(self, data):
        args = []
        for key, value in data.items():
            if key in ("nombre", "Nombre"):
                continue
            if value is None or value == "":
                continue
            if isinstance(value, bool):
                value = "true" if value else "false"
            elif isinstance(value, list):
                value = ",".join(value) if value else ""
                if not value:
                    continue
            campo = FIELD_MAP.get(key, key)
            args.extend(["-m", f"{campo}={value}"])
        return args

    def do_PUT(self):
        raw = unquote(self.path.strip("/"))
        if raw.startswith("debug/"):
            raw = raw[len("debug/"):]
            filename = raw
            tasks_dir = DEBUG_TASKS_DIR
            base_dir = DEBUG_BASE_DIR
        elif raw.startswith("tareas/"):
            raw = raw[len("tareas/"):]
            filename = raw
            tasks_dir = TASKS_DIR
            base_dir = BASE_DIR
        else:
            self.send_error(404, "Not found")
            return

        full_path = os.path.join(tasks_dir, filename)
        if not os.path.realpath(full_path).startswith(os.path.realpath(tasks_dir)):
            self.send_error(403, "Forbidden")
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            new_data = json.loads(body.decode("utf-8"))

            old_data = {}
            if os.path.exists(full_path):
                with open(full_path, "r", encoding="utf-8") as f:
                    old_data = json.load(f)

            args = [filename]
            changed = False
            all_keys = set(list(old_data.keys()) + list(new_data.keys()))
            for key in all_keys:
                old_val = old_data.get(key, "")
                new_val = new_data.get(key, "")

                old_cmp = self._normalize_for_diff(old_val)
                new_cmp = self._normalize_for_diff(new_val)

                if old_cmp != new_cmp:
                    if isinstance(new_val, bool):
                        new_val = "true" if new_val else "false"
                    elif isinstance(new_val, list):
                        new_val = ",".join(new_val) if new_val else ""
                    elif new_val is None:
                        new_val = ""
                    campo = FIELD_MAP.get(key, key)
                    args.extend(["-m", f"{campo}={new_val}"])
                    changed = True

            if changed:
                self._run_clatarea(args, base_dir)

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
        self._run_trashtarea([filename, "--dir", DEBUG_BASE_DIR])

    def handle_debug_permanent_delete(self, filename):
        if not filename.endswith(".json"):
            filename += ".json"
        self._run_trashtarea(["-d", filename, "--dir", DEBUG_BASE_DIR])

    def handle_debug_empty_trash(self):
        self._run_trashtarea(["-e", "-f", "--dir", DEBUG_BASE_DIR])

    def handle_debug_restore_task(self, path):
        filename = path[len("debug-papelera/"):-len("/restore")]
        if not filename.endswith(".json"):
            filename += ".json"
        self._run_trashtarea(["-r", filename, "--dir", DEBUG_BASE_DIR])
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status":"ok"}')

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
        elif path == "debug" or path == "debug/":
            self.handle_debug_create_clasificada_task()
        else:
            self.handle_create_clasificada_task(path)

    def handle_restore_task(self, path):
        filename = path[len("papelera/"):-len("/restore")]
        if not filename.endswith(".json"):
            filename += ".json"
        self._run_trashtarea(["-r", filename])
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status":"ok"}')

    def handle_create_pool_task(self, path):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))

            nombre = data.get("nombre", "sin-nombre")
            descripcion = data.get("descripcion", "")

            cmd = [sys.executable, os.path.join(THIS_DIR, "..", "Programa_addtarea", "addtarea"), nombre]
            if descripcion:
                cmd.append(descripcion)
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                raise Exception(result.stderr.strip() or "addtarea failed")
            filename = os.path.basename(result.stdout.strip())

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

            nombre = data.get("nombre", "Sin nombre")
            args = ["-n", nombre]
            args.extend(self._clatarea_field_map(data))

            stdout = self._run_clatarea(args, BASE_DIR)
            filename = self._extract_filename_from_output(stdout)

            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "filename": filename}).encode())
        except Exception as e:
            self.send_error(500, str(e))

    def handle_debug_create_clasificada_task(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))

            nombre = data.get("nombre", "Sin nombre")
            args = ["-n", nombre]
            args.extend(self._clatarea_field_map(data))

            stdout = self._run_clatarea(args, DEBUG_BASE_DIR)
            filename = self._extract_filename_from_output(stdout)

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

            args = [filename]
            args.extend(self._clatarea_field_map(data))

            stdout = self._run_clatarea(args, BASE_DIR)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "message": stdout,
            }).encode())
        except Exception as e:
            self.send_error(500, str(e))

    def handle_debug_create_pool_task(self, path):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))
            nombre = data.get("nombre", "sin-nombre")
            descripcion = data.get("descripcion", "")
            
            cmd = [sys.executable, os.path.join(THIS_DIR, "..", "Programa_addtarea", "addtarea"), nombre, "--pool", DEBUG_POOL_DIR]
            if descripcion:
                cmd.append(descripcion)
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                raise Exception(result.stderr.strip() or "addtarea failed")
            filename = os.path.basename(result.stdout.strip())
            
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

            args = [filename]
            args.extend(self._clatarea_field_map(data))

            stdout = self._run_clatarea(args, DEBUG_BASE_DIR)
            filename_out = self._extract_filename_from_output(stdout)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "message": f"Clasificada como {filename_out}",
            }).encode())
        except Exception as e:
            self.send_error(500, str(e))

    def _extract_filename_from_output(self, output):
        import re
        match = re.search(r"'([^']+\.json)'", output)
        if match:
            return match.group(1)
        return output

    def slugify(self, text):
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