# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

from flask import Flask

import config

app = Flask(__name__, static_url_path="", static_folder="../app/dist")


@app.route("/")
def index():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=config.CALLFLOW_CLIENT_PORT)
