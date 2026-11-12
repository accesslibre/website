"""Static local footer preview. Binds only 127.0.0.1:4185; no port fallback."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

class PreviewHandler(SimpleHTTPRequestHandler):
    def api(self):
        if self.path not in ('/api/request-config', '/api/request'):
            self.send_error(404)
            return
        size = int(self.headers.get('Content-Length', '0'))
        if size > 64000:
            self.send_error(413)
            return
        body = self.rfile.read(size) if self.command == 'POST' else None
        headers = {key: self.headers[key] for key in ('Origin', 'Content-Type') if key in self.headers}
        headers['User-Agent'] = 'LibreAccessibility-Local-Preview/1.0'
        request = Request('https://libreaccessibility-intake.libreaccessibility.workers.dev' + self.path, data=body, method=self.command, headers=headers)
        try:
            response = urlopen(request, timeout=70)
        except HTTPError as error:
            response = error
        except URLError:
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(b'{"error":"Sending is temporarily unavailable. Please use email."}')
            return
        with response:
            self.send_response(response.status)
            self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(response.read())

    def do_GET(self):
        if self.path.startswith('/api/'):
            return self.api()
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            return self.api()
        self.send_error(405)

if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 4185), partial(PreviewHandler, directory=str(Path(__file__).resolve().parent)))
    print('Workshop A + footer 1c preview: http://127.0.0.1:4185/', flush=True)
    server.serve_forever()
