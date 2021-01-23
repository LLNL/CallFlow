
import threading
import webbrowser
import pandas as pd
from IPython.display import IFrame
from http.server import HTTPServer, SimpleHTTPRequestHandler

class Singleton(object):
    def __new__(cls, *args, **kargs):
        if not hasattr(cls, "_instance"):
            cls._instance = super(Singleton, cls).__new__(cls)
        return cls._instance

class Plot(Singleton):
    def __init__(self, port=8000):
        # use singleton to and the condition below to avoid conflict due to
        # usage of the same html server address
        # TODO: need to check again the proper way to handle opened ports
        if len(vars(self)) == 0:
            self.port = port
            self.html_server = None
            self.html_server_thread = None

    def plot_emb(self, Z, y, inline_mode=True, out_file_path='./data/emb_result.json'):
        # start html server thread
        if self.html_server is None:
            self.html_server = HTTPServer(('localhost', self.port),
                                          SimpleHTTPRequestHandler)
            self.html_server_thread = threading.Thread(
                target=self.html_server.serve_forever)
            self.html_server_thread.daemon = True
            self.html_server_thread.start()

        # output Z and y as json
        df = pd.DataFrame(data=Z, columns=['x', 'y'])
        df['label'] = y
        df.to_json(out_file_path, orient='records')
        # load local webpage

        url = f'http://localhost:{self.port}/'
        view = IFrame(src=url, width='100%', height='600px') if inline_mode else webbrowser.open(url)
        return view