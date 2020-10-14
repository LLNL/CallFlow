# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# NOTE: The manager.py adopts Tensorboard's philosophy of launching applications
# through the IPython interface.
# The code can be found at https://github.com/tensorflow/tensorboard/blob/master/tensorboard/manager.py

import os
import time
import tempfile
import subprocess
import collections
import datetime
import errno
import json
import base64

from codecs import open

# ------------------------------------------------------------------------------
# CallFlow imports.

version = {}
vfile = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "callflow", "version.py"
)
with open(vfile) as fp:
    exec(fp.read(), version)
__version__ = version["__version__"]

CALLFLOW_APP_PORT = int(os.getenv("CALLFLOW_APP_PORT", 8000))
CALLFLOW_SERVER_PORT = int(os.getenv("CALLFLOW_SERVER_PORT", 5000))

# The following five types enumerate the possible return values of the
# `start` function.
# Indicates that a call to `start` was compatible with an existing
# CallFlow process, which can be reused according to the provided
# info.
StartReused = collections.namedtuple("StartReused", ("info",))

# Indicates that a call to `start` successfully launched a new
# CallFlow process, which is available with the provided info.
StartLaunched = collections.namedtuple("StartLaunched", ("info",))

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

# Information about a running CallFlow's info.
_CALLFLOW_INFO_FIELDS = collections.OrderedDict(
    (
        ("version", str),
        ("start_time", int),  # seconds since epoch
        ("pid", int),
        ("server_port", int),
        ("client_port", int),
        ("config", str),  # may be empty
        ("cache_key", str),  # opaque, as given by `cache_key` below
    )
)

CallFlowLaunchInfo = collections.namedtuple(
    "CallFlowLaunchInfo",
    _CALLFLOW_INFO_FIELDS,
)


def cache_key(working_directory, arguments):
    """
    @working_directory (str) - Current working directory
    @arguments (argparse.Namespace) - Arguments passed during launch.

    Returns a cache_key that encodes the input arguments
    Used for comparing instances after launch.
    """

    if not isinstance(arguments, dict):
        raise TypeError(
            "'arguments' should be a list of arguments, but found: %r "
            "(use `shlex.split` if given a string)" % (arguments,)
        )

    datum = {
        "working_directory": working_directory,
        "arguments": arguments,
    }
    raw = base64.b64encode(
        json.dumps(datum, sort_keys=True, separators=(",", ":")).encode("utf-8")
    )
    # `raw` is of type `bytes`, even though it only contains ASCII
    # characters; we want it to be `str` in both Python 2 and 3.
    return str(raw.decode("ascii"))


def _info_to_string(info):
    """
    Convert the callflow's launch info to json.
    """
    json_value = {k: getattr(info, k) for k in _CALLFLOW_INFO_FIELDS}
    return json.dumps(json_value, sort_keys=True, indent=4)


def _get_info_file_path():
    """Get path to info file for the current process.
    As with `_get_info_dir`, the info directory will be created if it
    does not exist.
    """
    return os.path.join(_get_info_dir(), "pid-%d.info" % os.getppid())


def write_info_file(info):
    """Write CallFlowInfo to the current process's info file.
    This should be called by `main` once the server is ready. When the
    server shuts down, `remove_info_file` should be called.
    Args:
      info: A valid `CallFlowLaunchInfo` object.
    Raises:
      ValueError: If any field on `info` is not of the correct type.
    """
    payload = "%s\n" % _info_to_string(info)
    path = _get_info_file_path()
    with open(path, "w") as outfile:
        outfile.write(payload)


def _exec(cmd):
    """
    cmd is expected to be something like "cd [place]"
    """
    cmd = cmd + " && pwd"
    p = subprocess.Popen(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
    )

    out = p.stdout.read()
    err = p.stderr.read()

    if out != "":
        os.chdir(out[0 : len(out) - 1])
    if err != "":
        print(err)
    return


def _get_info_dir():
    """Get path to directory in which to store info files.
    The directory returned by this function is "owned" by this module. If
    the contents of the directory are modified other than via the public
    functions of this module, subsequent behavior is undefined.
    The directory will be created if it does not exist.
    """

    path = os.path.join("/tmp", "callflow-info")
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


def get_launch_information():
    """
    Dump all current instances's CallFlowLaunchInfo into a list.
    """
    info_dir = _get_info_dir()
    results = []
    for filename in os.listdir(info_dir):
        if filename.split("-")[0] == "pid":
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
            results.append(info)
    return results


def _find_matching_instance(cache_key):
    """Find a running CallFlow instance compatible with the cache key.
    Returns:
      A `CalLFlowInfo` object, or `None` if none matches the cache key.
    """
    infos = get_launch_information()
    candidates = [info for info in infos if info["cache_key"] == cache_key]
    for candidate in sorted(candidates, key=lambda x: x["server_port"]):
        return candidate
    return None


def start(args, args_string):
    """
    Start a CallFlow (server and client) as a subprocess in the background.
    TODO: Improve logic to check if there is a callflow process already.
    """
    instance_cache_key = cache_key(working_directory=os.getcwd(), arguments=vars(args))
    match = _find_matching_instance(instance_cache_key)
    if match:
        return StartReused(info=match)

    """
    Launch python server.
    """
    print("Launching Server")
    """
    cwd = os.getcwd().split("CallFlow")[0] + "CallFlow/server/main.py"
    server_cmd = ["python3", cwd] + args_string
    """
    server_cmd = ["callflow_server"] + args_string
    launch_cmd(server_cmd, alias="server")

    """
    Launch callflow app server.
    """
    print("Launching client")
    app_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")
    prefix_string = ["--silent", "--prefix=" + app_path]
    client_cmd = ["npm", "run", "dev"] + prefix_string
    launch_cmd(client_cmd, alias="client")

    info = CallFlowLaunchInfo(
        version=__version__,
        start_time=int(time.time()),
        server_port=CALLFLOW_SERVER_PORT,
        client_port=CALLFLOW_APP_PORT,
        pid=os.getpid(),
        config=args.config,
        cache_key=instance_cache_key,
    )

    write_info_file(info)

    return StartLaunched(info="Started")


def launch_cmd(cmd, timeout=datetime.timedelta(seconds=100), alias=""):
    """
    Launch a cmd.
    """
    stdprefix_path = "/tmp/callflow-info/" + alias + "-"
    (stdout_fd, stdout_path) = tempfile.mkstemp(prefix=stdprefix_path + "stdout-")
    (stderr_fd, stderr_path) = tempfile.mkstemp(prefix=stdprefix_path + "stderr-")
    pid_path = _get_info_file_path()

    start_time_seconds = time.time()
    try:
        p = subprocess.Popen(
            cmd,
            stdout=stdout_fd,
            stderr=stderr_fd,
        )
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
            print(f"stdout for {alias} is dumped in {stdout_path}.")
            print(f"stderr for {alias} is dumped in {stdout_path}.")
            return StartFailed(
                exit_code=subprocess_result,
                stdout=_maybe_read_file(stdout_path),
                stderr=_maybe_read_file(stderr_path),
            )
        for info in get_launch_information():
            if info["pid"] == p.pid and info["start_time"] >= start_time_seconds:
                info = get_launch_information()
                print(f"CallFlow instance info is dumped in {pid_path}")
                return StartLaunched(info=info)
        else:
            return StartTimedOut(pid=p.pid)


def _maybe_read_file(filename):
    """Read the given file, if it exists.
    Args:
      filename: A path to a file.
    Returns:
      A string containing the file contents, or `None` if the file does
      not exist.
    """
    try:
        with open(filename) as infile:
            print(infile.read())
            return infile.read()
    except IOError as e:
        if e.errno == errno.ENOENT:
            return None
