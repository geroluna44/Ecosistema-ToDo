#!/usr/bin/env python3
import http.server
import socketserver
import os
import json
import re
from urllib.parse import unquote

TASKS_DIR = os.path.expanduser("~/tareas/clasificadas")
POOL_DIR = os.path.expanduser("~/tareas/pool")
PORT = 8080

class TasksHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=TASKS_DIR, **kwargs)

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
        else:
            self.handle_create_clasificada_task(path)

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
    print(f"http://localhost:{PORT}/")
    print("Press Ctrl+C to stop")

    os.makedirs(POOL_DIR, exist_ok=True)

    with socketserver.TCPServer(("", PORT), TasksHandler) as httpd:
        httpd.serve_forever()