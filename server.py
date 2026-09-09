"""
Standalone zero-dependency Python HTTP API Server
Runs directly with standard library (no pip packages needed)
Fully compatible with FastAPI endpoint signatures:
- POST /api/match
- POST /api/simulate
- GET  /api/schemes
- GET  /api/health
"""

import sys
import json
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Ensure local imports work
sys.path.insert(0, str(Path(__file__).parent))
from rule_engine import run_full_matching
from ai_advisor import generate_ai_explanation

SCHEMES_FILE = Path(__file__).parent / "schemes.json"

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

def get_schemes():
    with open(SCHEMES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

class ScholarshipAPIHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def _send_json_response(self, status_code: int, data: dict):
        response_bytes = json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def _serve_file(self, filepath: Path, content_type: str):
        if not filepath.exists():
            self._send_json_response(404, {"error": "File not found"})
            return
        content = filepath.read_bytes()
        self.send_response(200)
        self._send_cors_headers()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path in ("/", "/index.html"):
            index_file = FRONTEND_DIR / "index.html"
            self._serve_file(index_file, "text/html; charset=utf-8")
        elif path == "/app.js":
            app_file = FRONTEND_DIR / "app.js"
            self._serve_file(app_file, "application/javascript; charset=utf-8")
        elif path == "/api" or path == "/api/":
            self._send_json_response(200, {
                "name": "SchemeMatch AI",
                "service": "AI Scholarship & Government Scheme Eligibility Matcher API",
                "status": "online",
                "endpoints": ["/api/match", "/api/simulate", "/api/ai-explain", "/api/schemes", "/api/health"]
            })
        elif path == "/api/health":
            schemes = get_schemes()
            self._send_json_response(200, {
                "status": "healthy",
                "schemes_loaded": len(schemes),
                "service": "SchemeMatch AI Backend"
            })
        elif path == "/api/schemes":
            schemes = get_schemes()
            self._send_json_response(200, {
                "total_schemes": len(schemes),
                "schemes": schemes
            })
        else:
            # Check if requested static file exists in frontend
            rel_path = path.lstrip("/")
            candidate = FRONTEND_DIR / rel_path
            if candidate.exists() and candidate.is_file():
                ct = "text/plain"
                if rel_path.endswith(".html"): ct = "text/html"
                elif rel_path.endswith(".js"): ct = "application/javascript"
                elif rel_path.endswith(".css"): ct = "text/css"
                elif rel_path.endswith(".json"): ct = "application/json"
                self._serve_file(candidate, ct)
            else:
                self._send_json_response(404, {"error": "Not Found", "path": path})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")
        
        try:
            payload = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self._send_json_response(400, {"error": "Invalid JSON format"})
            return

        schemes = get_schemes()

        if path == "/api/match":
            result = run_full_matching(payload, schemes)
            self._send_json_response(200, result)

        elif path == "/api/ai-explain":
            selected = payload.get("selected_schemes", [])
            conflicts = payload.get("rejected_conflicting_schemes", [])
            profile = payload.get("student_profile", {})
            ai_res = generate_ai_explanation(selected, conflicts, profile)
            self._send_json_response(200, ai_res)

        elif path == "/api/simulate":
            result = run_full_matching(payload, schemes)
            response = {
                "total_benefit": result["total_benefit_amount"],
                "selected_schemes_count": len(result["selected_schemes"]),
                "selected_schemes": [
                    {
                        "id": s["id"],
                        "name": s["name"],
                        "benefit_amount": s["benefit_amount"],
                        "department": s["department"],
                        "match_score": s["match_score"],
                    }
                    for s in result["selected_schemes"]
                ],
                "rejected_conflicts_count": len(result["rejected_conflicting_schemes"]),
                "what_if_opportunities": result["what_if_opportunities"],
            }
            self._send_json_response(200, response)

        else:
            self._send_json_response(404, {"error": "Endpoint not found", "path": path})

    def log_message(self, format, *args):
        # Concise console logging
        sys.stderr.write(f"[API] {args[0]} - {args[1]}\n")


def run(port=8000):
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, ScholarshipAPIHandler)
    print(f"Backend Server running at http://127.0.0.1:{port}/")
    print(f"Health check: http://127.0.0.1:{port}/api/health")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()


if __name__ == "__main__":
    run(8000)
