#!/usr/bin/env python3
import http.server
import socketserver
import os
import json
import re
from urllib.parse import unquote

TASKS_DIR = os.path.expanduser("~/tareas/clasificadas")
POOL_DIR = os.path.expanduser("~/tareas/pool")
PAPELERA_DIR = os.path.expanduser("~/tareas/papelera")
PORT = 8080

class TasksHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=TASKS_DIR, **kwargs)

    def do_GET(self):
        path = unquote(self.path)

        if path.startswith("/papelera/"):
            relative = path[len("/papelera/"):]
            self.handle_papelera_get(relative)
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
        filepath = unquote(self.path.strip("/"))
        full_path = os.path.join(TASKS_DIR, filepath)

        if not full_path.startswith(TASKS_DIR):
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

    def do_POST(self):
        path = unquote(self.path.strip("/"))

        if path == "pool" or path.startswith("pool/"):
            self.handle_create_pool_task(path)
        elif path.startswith("papelera/") and path.endswith("/restore"):
            self.handle_restore_task(path)
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
            filename = f"{timestamp}.json"
            filepath = os.path.join(TASKS_DIR, filename)

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
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    print(f"Serving {TASKS_DIR}")
    print(f"Serving pool at {POOL_DIR}")
    print(f"Serving papelera at {PAPELERA_DIR}")
    print(f"http://localhost:{PORT}/")
    print("Press Ctrl+C to stop")

    os.makedirs(POOL_DIR, exist_ok=True)
    os.makedirs(PAPELERA_DIR, exist_ok=True)

    with socketserver.TCPServer(("", PORT), TasksHandler) as httpd:
        httpd.serve_forever()