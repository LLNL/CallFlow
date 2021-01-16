# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

# NOTE: The manager.py adopts Tensorboard's philosophy of launching applications
# through the IPython interface.
# The code can be found at https://github.com/tensorflow/tensorboard/blob/master/tensorboard/notebook.py
# ------------------------------------------------------------------------------

import json
import time
import datetime
import shlex
import random

try:
    import html

    html_escape = html.escape
    del html
except ImportError:
    import cgi

    html_escape = cgi.escape
    del cgi

import callflow

def load_ipython_extension(ipython):
    """Load the CallFLow notebook extension.
    Intended to be called from `%load_ext callflow`. Do not invoke this
    directly.
    Args:
      ipython: An `IPython.InteractiveShell` instance.
    """
    _register_magics(ipython)

def _register_magics(ipython):
    """
    Register IPython line/cell magics.
    Args:
      ipython: An `InteractiveShell` instance.
    """
    ipython.register_magic_function(
        _start_magic,
        magic_kind="line",
        magic_name="callflow",
    )

def _start_magic(line):
    """
    Implementation of the `%callflow` line magic.
    Launches and display a CallFlow instance as if at the command line.
    Args:
      args_string: Command-line arguments to CallFlow.
    """
    callflow.CallFlowServer(args=line, env="JUPYTER")

def _time_delta_from_info(info):
    """Format the elapsed time for the given TensorBoardInfo.
    Args:
      info: A TensorBoardInfo value.
    Returns:
      A human-readable string describing the time since the server
      described by `info` started: e.g., "2 days, 0:48:58".
    """
    delta_seconds = int(time.time()) - info["start_time"]
    return str(datetime.timedelta(seconds=delta_seconds))


def _display_ipython(port, height, display_handle):
    import IPython.display

    frame_id = "callflow-frame-{:08x}".format(random.getrandbits(64))
    shell = """
      <iframe id="%HTML_ID%" width="100%" height="%HEIGHT%" frameborder="0">
      </iframe>
      <script>
        (function() {
          const frame = document.getElementById(%JSON_ID%);
          const url = new URL(%URL%, window.location);
          const port = %PORT%;
          if (port) {
            url.port = port;
          }
          frame.src = url;
        })();
      </script>
    """
    replacements = [
        ("%HTML_ID%", html_escape(frame_id, quote=True)),
        ("%JSON_ID%", json.dumps(frame_id)),
        ("%HEIGHT%", "%d" % height),
        ("%PORT%", "%d" % port),
        ("%URL%", json.dumps("/")),
    ]

    for (k, v) in replacements:
        shell = shell.replace(k, v)
    iframe = IPython.display.HTML(shell)
    if display_handle:
        display_handle.update(iframe)
    else:
        IPython.display.display(iframe)
