# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import os
from flask import Flask

app = Flask(__name__, static_url_path="", static_folder="./dist")


@app.route("/")
def index():
    return app.send_static_file("index.html")


def main():
    CALLFLOW_APP_PORT = int(os.getenv("CALLFLOW_APP_PORT", 8000))
    app.run(host="127.0.0.1", port=CALLFLOW_APP_PORT)


if __name__ == "__main__":
    main()
