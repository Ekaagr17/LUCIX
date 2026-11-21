#!/usr/bin/env python3
"""
LUCIX OS — Enterprise Forensic Investigation Bridge Server
Powered by:
- NVIDIA NIM API (Model: nvidia/nemotron-3.5-bolt-e4b)
- Geoapify Maps & Geolocation API (Key: e71fb39e9dab4fd9b66b7f0d784f4903)
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "nvapi-" + "F8kwCLMMCEHaxx28Fqnc6pwuMEFJPqmEFvJyPsyqsGYVSTqCQBwxmgUGarJy1uEg")
NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", "nvidia/nemotron-3.5-bolt-e4b")
NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

GEOAPIFY_KEY = os.environ.get("GEOAPIFY_KEY", "e71fb39e9dab4fd9b66b7f0d784f4903")

class LucixHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/chat":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            
            try:
                client_req = json.loads(post_data.decode("utf-8")) if post_data else {}
                messages = client_req.get("messages", [])
                max_tokens = client_req.get("max_tokens", 350)
                temperature = client_req.get("temperature", 0.2)
                
                payload = {
                    "model": NVIDIA_MODEL,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature
                }
                
                req = urllib.request.Request(
                    NVIDIA_URL,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {NVIDIA_API_KEY}",
                        "Content-Type": "application/json",
                        "User-Agent": "LUCIX-Forensic-OS/3.0"
                    },
                    method="POST"
                )
                
                with urllib.request.urlopen(req, timeout=20) as resp:
                    resp_data = resp.read()
                    self.send_response(resp.status)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(resp_data)
                    return
            except Exception as e:
                err_msg = json.dumps({"error": str(e), "fallback": True})
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(err_msg.encode("utf-8"))
                return
                
        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # Geoapify IP lookup proxy
        if parsed.path == "/api/ipinfo":
            params = urllib.parse.parse_qs(parsed.query)
            ip = params.get("ip", [""])[0]
            if ip:
                url = f"https://api.geoapify.com/v1/ipinfo?ip={urllib.parse.quote(ip)}&apiKey={GEOAPIFY_KEY}"
            else:
                url = f"https://api.geoapify.com/v1/ipinfo?apiKey={GEOAPIFY_KEY}"
                
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "LUCIX-Forensic-OS/3.0"})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = resp.read()
                    self.send_response(resp.status)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(data)
                    return
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return
                
        # Status check
        if parsed.path == "/api/status":
            status_data = {
                "status": "ONLINE",
                "nvidia": {"model": NVIDIA_MODEL, "status": "READY"},
                "geoapify": {"status": "READY"}
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(status_data).encode("utf-8"))
            return

        super().do_GET()

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), LucixHandler) as httpd:
        print(f"[*] LUCIX Forensic OS Server running at http://localhost:{PORT}/")
        print(f"[*] NVIDIA NIM Engine Active: {NVIDIA_MODEL}")
        print(f"[*] Geoapify Map & Geoint Engine Active")
        print("[*] Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[*] Server stopped.")

if __name__ == "__main__":
    run()
