# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

# NOTE: This code adopts Tensorboard's philosophy of launching applications
# through the IPython interface.
# The code can be found at https://github.com/tensorflow/tensorboard/blob/master/tensorboard/notebook.py
# ------------------------------------------------------------------------------
import os
import time
import json
import errno
import base64
import random
import datetime
import tempfile
import subprocess
import collections

# IPython related imports.
import IPython

try:
    import html

    html_escape = html.escape
    del html
except ImportError:
    import cgi

    html_escape = cgi.escape
    del cgi

import logging

LOGGER = logging.getLogger(__name__)

# ------------------------------------------------------------------------------
# Information about a running CallFlow's info.
# ------------------------------------------------------------------------------
LAUNCH_INFO_DICT = collections.OrderedDict(
    (
        ("version", str),
        ("start_time", int),  # seconds since epoch
        ("pid", int),
        ("port", int),  # port number
        ("host", str),  # host IP
        ("config", str),  # may be empty
        ("cache_key", str),  # opaque, as given by `cache_key` below
    )
)

LAUNCH_INFO_TUPLE = collections.namedtuple(
    "CallFlowLaunchInfo",
    LAUNCH_INFO_DICT,
)


# ------------------------------------------------------------------------------
# The following five types enumerate the possible return values of the
# `start` function.
# ------------------------------------------------------------------------------

# Indicates that a call to `start` was compatible with an existing
# CallFlow process, which can be reused according to the provided
# info.
StartReused = collections.namedtuple("StartReused", ("info",))

# Indicates that a call to `start` successfully launched a new
# CallFlow process, which is available with the provided info.
StartLaunched = collections.namedtuple(
    "StartLaunched",
    (
        "info",
        "host",
        "port",
    ),
)

# Indicates that a call to `start` tried to launch a new CallFlow
# instance, but the subprocess exited with the given exit code and
# output streams.
StartFailed = collections.namedtuple(
    "StartFailed",
    (
        "exit_code",  # int, as `Popen.returncode` (negative for signal)
        "stdout",  # str, or `None` if the stream could not be read
        "stderr",  # str, or `None` if the stream could not be read
    ),
)

# Indicates that a call to `start` failed to invoke the subprocess.
StartExecFailed = collections.namedtuple(
    "StartExecFailed",
    ("os_error",),  # `OSError` due to `Popen` invocation
)

# Indicates that a call to `start` launched a CallFlow process, but
# that process neither exited nor wrote its info file within the allowed
# timeout period. The process may still be running under the included
# PID.
StartTimedOut = collections.namedtuple("StartTimedOut", ("pid",))


# ------------------------------------------------------------------------------
# public api of the ipython environment
# ------------------------------------------------------------------------------
def launch_ipython(args, config, host, port, launch_path, app_version):
    """
    Setup the IPython environment.

    :param args: Arguments (passed into CallFLow).
    :param config: CallFlow config
    :param host: Host to run callflow app
    :param port: Port to run callflow app
    :param launch_path: Path to save launch information
    :param app_version: CallFlow version id
    :return: StartLaunched or StartReused
    """
    assert isinstance(args, dict) and isinstance(config, dict)
    assert isinstance(host, str) and isinstance(port, int)
    assert isinstance(launch_path, str) and isinstance(app_version, str)

    _msg = f"Launching CallFlow {app_version} in ipython environment ({host}:{port})"
    LOGGER.info(_msg)
    handle = IPython.display.display(IPython.display.Pretty(_msg), display_id=True)

    # Set cache key to store the current instance's arguments.
    cache_key = _get_cache_key(working_directory=os.getcwd(), arguments=args)

    # Launch information
    launch_path = os.path.abspath(launch_path)
    launch_file = os.path.join(launch_path, "pid-{}.info".format(os.getppid()))
    _mkdir(launch_path)

    # Find a matching instance to the current launch.
    matching_instance = _find_matching_instance(launch_path)

    # --------------------------------------------------------------------------
    # If a match exists, use it.
    if matching_instance:
        start_result = StartReused(info=matching_instance)

        print(start_result)
        LOGGER.critical("blocking reuse")
        exit(1)
        pid = int(start_result.info["pid"])
        port = int(start_result.info["port"])
        client_port = int(start_result.info["client_port"])
        time_delta = int(time.time()) - start_result.info["start_time"]
        time_delta = str(datetime.timedelta(seconds=time_delta))

        _msg = (
            f"Reusing CallFlow's server is on port {port} and "
            f"client is on {client_port} (pid {pid}), "
            f"started {time_delta} ago. (Use '!kill {pid}' to kill it.)"
        )

        LOGGER.info(_msg)
        _print_message_in_ipython(handle, _msg)
        _display_ipython(port=client_port, height=800, display_handle=None)

    # --------------------------------------------------------------------------
    # Launch the server command
    else:
        server_cmd = _create_cmd(args)
        LOGGER.debug(f"Launching command ({server_cmd})")
        launch_result = _launch_app(
            server_cmd,
            host=host,
            port=port,
            info_dir=launch_path,
            instance=matching_instance,
        )

        if not isinstance(launch_result, StartLaunched):
            LOGGER.critical("Exiting due to launch failure")
            exit(1)

        # Construct the CallFlowLaunchInfo object.
        launch_info = LAUNCH_INFO_TUPLE(
            version=app_version,
            config=config,
            port=port,
            host=host,
            start_time=int(time.time()),
            pid=os.getpid(),
            cache_key=cache_key,
        )

        # Store the CallFlowLaunchInfo object.
        _write_launch_info_file(launch_file, launch_info)

        # Trigger a return that the callflow process has been triggered.
        _display_ipython(port=port, height=800, display_handle=handle)


def load_ipython(ipython, server):
    """
    Load the CallFLow notebook extension.
    Intended to be called from `%load_ext callflow`. Do not invoke this
    directly.

    :param ipython: An `IPython.InteractiveShell` instance.
    :param server:
    """
    assert callable(server)
    _register_magics(ipython, server)


def _register_magics(ipython, server):
    """
    Register IPython line/cell magics.

    :param ipython: An `InteractiveShell` instance.
    """
    assert callable(server)
    # TODO: need to register with start magic
    ipython.register_magic_function(
        _start_magic, magic_kind="line", magic_name="callflow"
    )


def _start_magic(line):
    """
    Implementation of the `%callflow` line magic.
    Launches and display a CallFlow instance as if at the command line.

    :param line: text (command-line arguments) passed using %callflow
    """
    # TODO: needs to be fixed!
    callflow.CallFlowServer(args=line, env="JUPYTER")  # noqa


def _launch_app(
    cmd, host, port, info_dir, instance, timeout=datetime.timedelta(seconds=100)
):
    """
    Launch the subprocess and the CallFlow app.
    :param cmd:
    :param info_dir:
    :param instance:
    :param timeout:
    :return:
    """

    LOGGER.info(f"Launching app in ({info_dir})")
    (stdout_fd, stdout_path) = tempfile.mkstemp(prefix=info_dir + "stdout-")
    (stderr_fd, stderr_path) = tempfile.mkstemp(prefix=info_dir + "stderr-")

    start_time_seconds = time.time()
    try:
        p = subprocess.Popen(cmd, stdout=stdout_fd, stderr=stderr_fd)
    except OSError as e:
        LOGGER.critical(
            f"Launch failed. " f"For logs, see ({stdout_path}) and ({stderr_path})"
        )
        return StartExecFailed(os_error=e)
    finally:
        os.close(stdout_fd)
        os.close(stderr_fd)

    poll_interval_seconds = 2
    end_time_seconds = start_time_seconds + timeout.total_seconds()
    while time.time() < end_time_seconds:
        time.sleep(poll_interval_seconds)
        subprocess_result = p.poll()
        if subprocess_result is not None:
            LOGGER.critical(
                f"Launch failed. " f"For logs, see ({stdout_path}) and ({stderr_path})"
            )
            return StartFailed(
                exit_code=subprocess_result,
                stdout=_read_launch_info_file(stdout_path),
                stderr=_read_launch_info_file(stderr_path),
            )
        else:
            LOGGER.info("Launch Successful.")
            return StartLaunched(info=instance, host=host, port=port)

    LOGGER.critical(
        f"Launch timed out. " f"For logs, see ({stdout_path}) and ({stderr_path})"
    )
    return StartTimedOut(pid=p.pid)


def _display_ipython(port, height, display_handle):
    """
    Display Javascript and HTML in IPython cell.

    :param port:
    :param height:
    :param display_handle:
    :return:
    """

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


# ------------------------------------------------------------------------------
# Utilities
# ------------------------------------------------------------------------------
def _mkdir(path):
    """
    Make the directory, if it does not exist.

    :param path: path to directory to be checked
    :return path: path where directory was created.
    """
    try:
        os.makedirs(path)
    except OSError as e:
        if e.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise
    else:
        os.chmod(path, 0o777)
    return path


def _print_message_in_ipython(handle, message):
    """
    Print message using ipython handle
    :param handle: ipython handle
    :param message: message to be printed
    :return: None
    """
    if handle is None:
        print(message)
    else:
        handle.update(IPython.display.Pretty(message))


def _create_cmd(args):
    """
    Create the `callflow` command with a default data and format
    :param args: arguments passed into callflow through config object
    :return server_cmd: Populated command based on the config object
    """
    # TODO: remove hardcoding
    server_cmd = [
        "callflow",
        "--data_path",
        "./data/lulesh-8-runs-original",
        "--profile_format",
        "caliper_json",
        "--verbose",
    ]
    return server_cmd

    server_cmd = ["callflow"]
    for k, v in args.items():
        if v is not None:
            server_cmd += [f"--{k}", f"{v}"]


# ------------------------------------------------------------------------------
# Read-write operations to the LAUNCH_INFO to a file.
# ------------------------------------------------------------------------------
def _read_launch_info_file(filename):
    """
    Read the given file, if it exists.

    :param filename: A path to a file.
    :return A string containing the file contents, or `None` if the file does not exist.
    """
    try:
        with open(filename) as infile:
            return infile.read()
    except IOError as e:
        if e.errno == errno.ENOENT:
            return None
    return None


def _write_launch_info_file(filename, info):
    """
    Write CallFlowInfo to the current process's info file.
    This should be called by `main` once the server is ready. When the
    server shuts down, `remove_info_file` should be called.

    Raises:
       ValueError: If any field on `info` is not of the correct type.

    :param info: A valid `CallFlowLaunchInfo` object.
    """
    json_value = {k: getattr(info, k) for k in LAUNCH_INFO_DICT}
    payload = json.dumps(json_value, sort_keys=True, indent=4)
    with open(filename, "w") as outfile:
        outfile.write(payload + "\n")


# ------------------------------------------------------------------------------
# Find matching instance.
# ------------------------------------------------------------------------------
def _find_matching_instance(info_dir):
    """
    Find a matching instance for a given info_dir.

    :param info_dir: Cache key that needs to be matched.
    :return: A `CalLFlowInfo` object, or `None` if none matches the cache key.
    """
    LOGGER.debug(f"Finding matching instances in ({info_dir})")

    # find all instances
    instances = []
    for filename in os.listdir(info_dir):
        if filename.split("-")[0] == "pid":
            info = {}
            filepath = os.path.join(info_dir, filename)
            try:
                with open(filepath) as infile:
                    contents = infile.read()
            except IOError as e:
                if e.errno == errno.EACCES:
                    # May have been written by this module in a process whose
                    # `umask` includes some bits of 0o444.
                    continue
                else:
                    raise
            try:
                info = json.loads(contents)
            except ValueError:
                # Ignore unrecognized files, logging at debug only.
                LOGGER.error(f"Invalid info file: ({filepath})")
            instances.append(info)

    # find matching
    candidates = [info for info in instances if info["cache_key"] == info_dir]
    for candidate in sorted(candidates, key=lambda x: x["port"]):
        LOGGER.debug(f"Found a matching instances in ({info_dir})")
        return candidate

    LOGGER.debug(f"Did not find any matching instances in ({info_dir})")


def _get_cache_key(working_directory, arguments):
    """
    Get a cache key for an CallFlowLaunchInfo instance.

    :param working_directory: Current working directory
    :param arguments:  Arguments passed during launch.
    :return:  a cache_key that encodes the input arguments used for comparing instances after launch.
    """
    if not isinstance(arguments, dict):
        raise TypeError(
            "'arguments' should be a list of arguments, "
            "but found: %r  (use `shlex.split` if given a string)" % (arguments,)
        )

    datum = {"working_directory": working_directory, "arguments": arguments}
    raw = base64.b64encode(
        json.dumps(datum, sort_keys=True, separators=(",", ":")).encode("utf-8")
    )
    # `raw` is of type `bytes`, even though it only contains ASCII
    # characters; we want it to be `str` in both Python 2 and 3.
    return str(raw.decode("ascii"))


# ------------------------------------------------------------------------------
