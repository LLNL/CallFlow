# vue-flask.py

from flask import Flask

app = Flask(__name__, static_url_path="", static_folder="dist")


@app.route("/")
def index():
    # changed to send_static_file
    return app.send_static_file("index.html")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
