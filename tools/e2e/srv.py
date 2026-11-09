import threading, http.server, functools
def start():
    h=functools.partial(http.server.SimpleHTTPRequestHandler, directory="/tmp/e2e/site")
    class Q(h.func):
        def log_message(self,*a): pass
    s=http.server.ThreadingHTTPServer(("127.0.0.1",8765),functools.partial(Q,directory="/tmp/e2e/site"))
    threading.Thread(target=s.serve_forever,daemon=True).start(); return s
