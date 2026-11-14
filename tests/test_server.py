import importlib.util
import threading
import unittest
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

spec = importlib.util.spec_from_file_location('return_server', Path(__file__).parents[1] / 'server.py')
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)

class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = app.ThreadingHTTPServer(('127.0.0.1', 0), app.Handler)
        cls.server.template = (app.ROOT / 'template.html').read_text(encoding='utf-8')
        cls.url = 'http://127.0.0.1:' + str(cls.server.server_port)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def request(self, path, data=None, method=None, headers=None):
        if data is not None:
            data = urllib.parse.urlencode(data).encode()
        request = urllib.request.Request(self.url + path, data=data, method=method, headers=headers or {})
        try:
            return urllib.request.urlopen(request)
        except urllib.error.HTTPError as error:
            return error

    def test_normal_post_and_escaping(self):
        values = {'address': '测试路1号<script>alert(1)</script>', 'name': '{{RETURN_PHONE}}', 'phone': '13800138000'}
        with self.request('/generate', values) as response:
            body = response.read().decode()
            self.assertEqual(response.status, 200)
            self.assertIn('&lt;script&gt;', body)
            self.assertNotIn('<script', body.lower())
            self.assertIn('{{RETURN_PHONE}}', body)
            self.assertEqual(response.headers['Cache-Control'], 'no-store')

    def test_download(self):
        with self.request('/download', {'address': '测试路1号', 'name': '测试收件人', 'phone': '13800138000'}) as response:
            self.assertEqual(response.status, 200)
            self.assertIn('attachment', response.headers['Content-Disposition'])
            self.assertIn('测试收件人', response.read().decode())

    def test_invalid_form(self):
        for values in ({}, {'name': '张三'}, {'address': 'a' * 1001, 'name': '张三', 'phone': '13800138000'},
                       [('address', 'a'), ('name', '张三'), ('name', '李四'), ('phone', '13800138000')]):
            with self.request('/generate', values) as response:
                self.assertIn(response.status, (400, 413))

    def test_private_files_not_served(self):
        for path in ('/server.py', '/template.html', '/.git/config', '/%2e%2e/server.py'):
            with self.request(path) as response:
                self.assertEqual(response.status, 404)

    def test_static_head(self):
        with self.request('/app.js', method='HEAD') as response:
            self.assertEqual(response.status, 200)
            self.assertIn('javascript', response.headers['Content-Type'])
            self.assertEqual(response.read(), b'')

    def test_native_mobile_form(self):
        # Rendering has no JavaScript, popup, blob URL or client-storage dependency.
        for ua in ('Mozilla/5.0 (Linux; Android 14) Quark/7.0', 'Mozilla/5.0 (Linux; Android 14) MiuiBrowser/18.0'):
            with self.request('/generate', {'address': '测试路1号', 'name': '测试收件人', 'phone': '13800138000'}, headers={'User-Agent': ua}) as response:
                self.assertEqual(response.status, 200)
                self.assertIn('测试路1号', response.read().decode())

if __name__ == '__main__':
    unittest.main()
