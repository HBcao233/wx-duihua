import http.server
import socketserver

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
  def end_headers(self):
    # self.send_header('Cache-Control', 'no-store')
    # 或者使用 'no-cache' 来允许缓存但每次都需验证
    self.send_header('Cache-Control', 'no-cache')
    super().end_headers()

PORT = 8000
with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
  print(f"Serving at port {PORT}")
  httpd.serve_forever()
