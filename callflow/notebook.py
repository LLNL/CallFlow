# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
import shlex
import json


def _load_ipython_extension(ipython):
    """Load the TensorBoard notebook extension.
    Intended to be called from `%load_ext callflow`. Do not invoke this
    directly.
    Args:
      ipython: An `IPython.InteractiveShell` instance.
    """
    _register_magics(ipython)


def _register_magics(ipython):
    """Register IPython line/cell magics.
    Args:
      ipython: An `InteractiveShell` instance.
    """
    ipython.register_magic_function(
        _start_magic, magic_kind="line", magic_name="callflow",
    )


def _start_magic(line):
    """Implementation of the `%callflow` line magic."""
    return start(line)


def start(args_string):
    """Launch and display a TensorBoard instance as if at the command line.
    Args:
      args_string: Command-line arguments to TensorBoard, to be
        interpreted by `shlex.split`: e.g., "--logdir ./logs --port 0".
        Shell metacharacters are not supported: e.g., "--logdir 2>&1" will
        point the logdir at the literal directory named "2>&1".
    """
    try:
        import IPython
        import IPython.display
    except ImportError:
        IPython = None

    handle = IPython.display.display(
        IPython.display.Pretty("Launching CallFlow..."), display_id=True,
    )

    def print_or_update(message):
        if handle is None:
            print(message)
        else:
            handle.update(IPython.display.Pretty(message))

    parsed_args = shlex.split(args_string, comments=True, posix=True)
    print(parsed_args)


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
    proxy_url = os.environ.get("TENSORBOARD_PROXY_URL")
    if proxy_url is not None:
        # Allow %PORT% in $TENSORBOARD_PROXY_URL
        proxy_url = proxy_url.replace("%PORT%", "%d" % port)
        replacements = [
            ("%HTML_ID%", html_escape(frame_id, quote=True)),
            ("%JSON_ID%", json.dumps(frame_id)),
            ("%HEIGHT%", "%d" % height),
            ("%PORT%", "0"),
            ("%URL%", json.dumps(proxy_url)),
        ]
    else:
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
