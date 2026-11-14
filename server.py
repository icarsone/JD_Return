"""Small stateless HTML renderer. Run behind nginx; requires only Python 3."""
import argparse
import html
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
from urllib.parse import parse_qs, unquote, urlsplit

ROOT = Path(__file__).resolve().parent / 'dist'
LIMITS = {'address': 1000, 'name': 80, 'phone': 80}
TOKENS = {'RETURN_ADDRESS': 'address', 'RETURN_NAME': 'name', 'RETURN_PHONE': 'phone'}
TOKEN_RE = re.compile(r'\{\{(RETURN_ADDRESS|RETURN_NAME|RETURN_PHONE)\}\}')
RESULT_CSP = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
EDITOR_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"

def render(template, values):
    # One pass prevents user-entered placeholder strings being substituted again.
    return TOKEN_RE.sub(lambda m: html.escape(values[TOKENS[m[1]]], quote=True), template)

class Handler(BaseHTTPRequestHandler):
    server_version = 'ReturnEditor/2'

    def log_message(self, format, *args):
        # Do not write addresses, phone numbers, request bodies or query strings.
        pass

    def reply(self, status, body=b'', content_type='text/html; charset=utf-8', extra=None, result=False):
        if isinstance(body, str):
            body = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', RESULT_CSP if result else EDITOR_CSP)
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def error_page(self, status, message):
        self.reply(status, '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>无法生成</title><p>' + html.escape(message) + '</p><a href="/">返回填写</a></html>')

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path in ('/generate', '/download', '/京东退货详情修改器', '/京东退货详情修改器.html'):
            return self.reply(303, extra={'Location': '/'})
        if path == '/healthz':
            return self.reply(200, 'ok\n', 'text/plain; charset=utf-8')
        files = {'/': ('index.html', 'text/html; charset=utf-8'), '/index.html': ('index.html', 'text/html; charset=utf-8'),
                 '/app.js': ('app.js', 'application/javascript; charset=utf-8'),
                 '/address-parser.js': ('address-parser.js', 'application/javascript; charset=utf-8'),
                 '/styles.css': ('styles.css', 'text/css; charset=utf-8')}
        if path not in files:
            return self.error_page(404, '页面不存在。')
        filename, content_type = files[path]
        self.reply(200, (ROOT / 'public' / filename).read_bytes(), content_type)

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in ('/generate', '/download'):
            return self.error_page(404, '页面不存在。')
        if self.headers.get('Content-Type', '').split(';')[0].lower() != 'application/x-www-form-urlencoded':
            return self.error_page(415, '请使用页面表单提交。')
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 16384:
                return self.error_page(413, '填写内容过长或为空。')
            raw = self.rfile.read(length).decode('utf-8', errors='strict')
            data = parse_qs(raw, keep_blank_values=True, encoding='utf-8', errors='strict', max_num_fields=10)
            values = {}
            for key, limit in LIMITS.items():
                if len(data.get(key, [])) != 1:
                    raise ValueError('请完整填写寄回地址、收件人和联系电话。')
                value = data[key][0].strip()
                if not value or len(value) > limit or any(ord(c) < 32 and c not in '\n\t\r' for c in value):
                    raise ValueError('字段为空、过长或包含无效字符，请返回检查。')
                values[key] = value
        except (ValueError, UnicodeError):
            return self.error_page(400, '表单内容无效，请返回检查三个字段。')
        output = render(self.server.template, values)
        headers = {'Content-Disposition': 'attachment; filename="return-details.html"'} if path == '/download' else {}
        self.reply(200, output, extra=headers, result=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=4321)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.template = (ROOT / 'template.html').read_text(encoding='utf-8')
    server.serve_forever()
