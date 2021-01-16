# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

# NOTE: The manager.py adopts Tensorboard's philosophy of launching applications
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
CALLFLOW_LAUNCH_INFO = collections.OrderedDict(
    (
        ("version", str),
        ("start_time", int),  # seconds since epoch
        ("pid", int),
        ("port", int),        # port number
        ("host", str),        # host IP
        ("config", str),      # may be empty
        ("cache_key", str),   # opaque, as given by `cache_key` below
    )
)

CallFlowLaunchInfo = collections.namedtuple(
    "CallFlowLaunchInfo",
    CALLFLOW_LAUNCH_INFO,
)


def _get_callflow_version():
    """
    Get the callflow version.
    :return: version
    """
    text = {}

    CALLFLOW_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    vfile = os.path.join(CALLFLOW_DIR, "version.py")
    with open(vfile) as fp:
        exec(fp.read(), text)
        return text["__version__"]

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
StartLaunched = collections.namedtuple("StartLaunched",
                                       ("info", "host", "port",))

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
def launch_ipython(args, config, host, port):
    """
    Setup the IPython environment.

    :param args:    Arguments (passed into CallFLow).
    :param config:  Callflow config
    :param host:
    :param port:
    :return: StartLaunched or StartReused
    """
    assert isinstance(args, dict) and isinstance(config, dict)
    assert isinstance(host, str) and isinstance(port, int)

    _msg = f'Launching CallFlow in ipython environment ({host}) ({port})'
    LOGGER.info(_msg)
    handle = IPython.display.display(IPython.display.Pretty(_msg),
                                     display_id=True)

    '''
    print(' -------------------- ')
    print (args)
    print (' '.join(args))
    print (config)
    print (' -------------------- ')
    '''

    # Set cache key to store the current instance's arguments.
    cache_key = _get_cache_key(working_directory=os.getcwd(), arguments=args)

    # Collect the version of CallFlow being executed.
    version = _get_callflow_version()

    # Launch information (CallFlowLaunchInfo) would be saved inside the config['save_path']
    launch_info_path = os.path.join(config["save_path"], "launch-info")
    launch_info_path = os.path.abspath(launch_info_path)
    launch_info_file = os.path.join(launch_info_path, "pid-{}.info".format(os.getppid()))
    _mkdir(launch_info_path)

    # Find a matching instance to the current launch.
    matching_instance = _find_matching_instance(launch_info_path)

    # --------------------------------------------------------------------------
    # If a match exists, use it.
    if matching_instance:
        start_result = StartReused(info=matching_instance)
        #return start_result

        print (start_result)
        exit()
        pid = int(start_result.info["pid"])
        port = int(start_result.info["port"])
        client_port = int(start_result.info["client_port"])
        time_delta = int(time.time()) - start_result.info["start_time"]
        time_delta = str(datetime.timedelta(seconds=time_delta))

        _msg = f"Reusing CallFlow's server is on port {port} and " \
               f"client is on {client_port} (pid {pid}), " \
               f"started {time_delta} ago. (Use '!kill {pid}' to kill it.)"

        LOGGER.info(_msg)
        _print_message_in_ipython(handle, _msg)
        _display_ipython(port=client_port, height=800, display_handle=None)

    # --------------------------------------------------------------------------
    # Launch the server command
    else:
        server_cmd = ["callflow_server"]
        for k,v in args.items():
            if v is not None:
                server_cmd += [f'--{k}',f'{v}']
        LOGGER.debug('launching ({})'.format(' '.join(server_cmd)))

        # TODO: fix the hardcoding
        server_cmd = ['callflow_server',
                      '--data_path', './data/lulesh-8-runs-original',
                      '--profile_format', 'caliper_json',
                      '--verbose']
        LOGGER.debug('launching ({})'.format(' '.join(server_cmd)))

        launch_result = _launch_app(server_cmd, host=host, port=port,
                                    info_dir=launch_info_path,
                                    instance=matching_instance)

        if not isinstance(launch_result, StartLaunched):
            LOGGER.critical('exiting due to launch failure')
            exit(1)

        # Construct the CallFlowLaunchInfo object.
        launch_info = CallFlowLaunchInfo(version=version, port=port, host=host,
                                         config=config,
                                         start_time=int(time.time()),
                                         pid=os.getpid(), cache_key=cache_key)

        # Store the CallFlowLaunchInfo object.
        _write_launch_info_file(launch_info_file, launch_info)

        # Trigger a return that the callflow process has been triggered.
        #return launch_result
        _display_ipython(port=port, height=800, display_handle=handle)

'''
def run_ipython_environment(start_result):
    """
    Run the jupyter environment

    :param start_result: StartLaunched or StartReused
    :return: None
    """
    LOGGER.info(f'Executing the ipython environment ({start_result})')

    handle = IPython.display.display(
        IPython.display.Pretty("Launching CallFlow..."),
        display_id=True,
    )

    if isinstance(start_result, StartLaunched):
        # TODO: for consistency, should be result.info["port]
        port = int(start_result.port)
        _display_ipython(port=port, height=800, display_handle=handle)

    elif isinstance(start_result, StartReused):

        pid = int(start_result.info["pid"])
        port = int(start_result.info["port"])
        client_port = start_result.info["client_port"]
        time_delta = int(time.time()) - start_result.info["start_time"]
        time_delta = str(datetime.timedelta(seconds=time_delta))

        message = f"Reusing CallFlow's server is on port {port} and " \
                  f"client is on {client_port} (pid {pid}), " \
                  f"started {time_delta} ago. (Use '!kill {pid}' to kill it.)"

        _print_message_in_ipython(handle, message)
        _display_ipython(port=client_port, height=800, display_handle=None)
'''

def load_ipython(ipython, server):
    """
    Load the CallFLow notebook extension.
    Intended to be called from `%load_ext callflow`. Do not invoke this
    directly.

    :param ipython: An `IPython.InteractiveShell` instance.
    """
    assert callable(server)
    _register_magics(ipython, server)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
def _register_magics(ipython, server):
    """
    Register IPython line/cell magics.
    
    :param ipython: An `InteractiveShell` instance.
    """
    assert callable(server)
    # TODO: need to resgister with start magic
    ipython.register_magic_function(_start_magic,
                                    magic_kind="line",
                                    magic_name="callflow")


def _start_magic(line):
    """
    Implementation of the `%callflow` line magic.
    Launches and display a CallFlow instance as if at the command line.
    
    :param line: text (command-line arguments) passed using %callflow
    """
    # TODO: needs to be fixed!
    callflow.CallFlowServer(args=line, env="JUPYTER")


# ------------------------------------------------------------------------------
def _launch_app(cmd, host, port, info_dir, instance,
                timeout=datetime.timedelta(seconds=100)):
    """
    Launch the subprocess and the CallFlow app.
    :param cmd:
    :param info_dir:
    :param instance:
    :param timeout:
    :return:
    """

    LOGGER.info(f'Launching app in ({info_dir})')
    (stdout_fd, stdout_path) = tempfile.mkstemp(prefix=info_dir + "stdout-")
    (stderr_fd, stderr_path) = tempfile.mkstemp(prefix=info_dir + "stderr-")

    start_time_seconds = time.time()
    try:
        p = subprocess.Popen(cmd, stdout=stdout_fd, stderr=stderr_fd)
    except OSError as e:
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
            LOGGER.critical(f'Launch failed. '
                            f'For logs, see ({stdout_path}) and ({stderr_path})')
            return StartFailed(exit_code=subprocess_result,
                               stdout=_read_launch_info_file(stdout_path),
                               stderr=_read_launch_info_file(stderr_path))
        else:
            LOGGER.info(f'Launch Successful.')
            return StartLaunched(info=instance, host=host, port=port)

    LOGGER.critical(f'Launch timed out. '
                    f'For logs, see ({stdout_path}) and ({stderr_path})')
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


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
def _mkdir(path):
    """
    Get path to directory in which to store info files.
    The directory returned by this function is "owned" by this module. If
    the contents of the directory are modified other than via the public
    functions of this module, subsequent behavior is undefined.
    The directory will be created if it does not exist.

    :param path:
    :return:
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

'''
def _get_info_file_path():
    """
    Get path to info file for the current process.
    As with `_get_info_dir`, the info directory will be created if it
    does not exist.
    """
    pid = os.getppid()
    return os.path.join(_get_info_dir(), f"pid-{pid}.info")


def _info_to_string(info):
    """
    Convert the CallFlow's launch info to json.

    :param info: CallFlowLaunchInfo instance
    :return: JSON representation for CallFlowLaunchInfo
    """
    json_value = {k: getattr(info, k) for k in CALLFLOW_LAUNCH_INFO}
    return json.dumps(json_value, sort_keys=True, indent=4)


def _time_delta_from_info(info):
    """
    Human-readable format for the elapsed time for the given CallFlowInstance.

    :param info: A CallFlowInfo instance.
    :return: A human-readable string describing the time since the server
        described by `info` started: e.g., "2 days, 0:48:58".
    """
    delta_seconds = int(time.time()) - info["start_time"]
    return str(datetime.timedelta(seconds=delta_seconds))
'''


# ------------------------------------------------------------------------------
def _read_launch_info_file(filename):
    """
    Read the given file, if it exists.

    :param filename: A path to a file.
    :return A string containing the file contents, or `None` if the file does not exist.
    """
    try:
        with open(filename) as infile:
            #print(infile.read())
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

    json_value = {k: getattr(info, k) for k in CALLFLOW_LAUNCH_INFO}
    payload = json.dumps(json_value, sort_keys=True, indent=4)
    # payload = "%s\n" % _info_to_string(info)
    with open(filename, "w") as outfile:
        outfile.write(payload + '\n')


# ------------------------------------------------------------------------------
'''
def _find_all_instance(info_dir):
    """
    Find all existing CallFlow instances.

    :param info_dir: Directory where the CallFlowInfo is stored.
    :return: all possible candidates that can be spawned.
    """
    launch_info = []
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
                print("invalid info file: %r", filepath)
            launch_info.append(info)

    return launch_info
'''


def _find_matching_instance(info_dir):
    """
    Find a matching instance for a given info_dir.

    :param info_dir: Cache key that needs to be matched.
    :return: A `CalLFlowInfo` object, or `None` if none matches the cache key.
    """
    LOGGER.debug(f'Finding matching instances in ({info_dir})')

    # find all instances
    instances = []
    for filename in os.listdir(info_dir):
        if filename.split("-")[0] == "pid": # TODO: should be central
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
        LOGGER.debug(f'Found a matching instances in ({info_dir})')
        return candidate

    LOGGER.debug(f'Did not find any matching instances in ({info_dir})')


def _get_cache_key(working_directory, arguments):
    """
    Get a cache key for an CallFlowLaunchInfo instance.

    :param working_directory: Current working directory
    :param arguments:  Arguments passed during launch.
    :return:  a cache_key that encodes the input arguments used for comparing instances after launch.
    """
    if not isinstance(arguments, dict):
        raise TypeError("'arguments' should be a list of arguments, "
                        "but found: %r  (use `shlex.split` if given a string)"
                        % (arguments,))

    datum = {"working_directory": working_directory,
             "arguments": arguments}
    raw = base64.b64encode(
        json.dumps(datum, sort_keys=True, separators=(",", ":")).encode("utf-8")
    )
    # `raw` is of type `bytes`, even though it only contains ASCII
    # characters; we want it to be `str` in both Python 2 and 3.
    return str(raw.decode("ascii"))


# ------------------------------------------------------------------------------
