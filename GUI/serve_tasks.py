#!/usr/bin/env python3
import http.server
import socketserver
import os
import json
from urllib.parse import unquote

TASKS_DIR = os.path.expanduser("~/tareas/clasificadas")
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

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    print(f"Serving {TASKS_DIR}")
    print(f"http://localhost:{PORT}/")
    print("Press Ctrl+C to stop")

    with socketserver.TCPServer(("", PORT), TasksHandler) as httpd:
        httpd.serve_forever()
