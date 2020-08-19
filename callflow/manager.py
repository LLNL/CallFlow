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
    "StartExecFailed", ("os_error",),  # `OSError` due to `Popen` invocation
)

# Indicates that a call to `start` launched a CallFlow process, but
# that process neither exited nor wrote its info file within the allowed
# timeout period. The process may still be running under the included
# PID.
StartTimedOut = collections.namedtuple("StartTimedOut", ("pid",))


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
    path = os.path.join(tempfile.gettempdir(), ".callflow-info")
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
    info_dir = _get_info_dir()
    results = []
    for filename in os.listdir(info_dir):
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
            info = contents
        except ValueError:
            # Ignore unrecognized files, logging at debug only.
            print("invalid info file: %r", filepath)
        else:
            results.append(info)
    return results


def start(args):
    """
    Start a CallFlow (server and client) as a subprocess in the background.
    TODO: Improve logic to check if there is a callflow process already. 
    TODO: Fix the path not found error.
    """

    """
    Launch python server.
    """
    print("Launching Server")
    cwd = os.getcwd().split("CallFlow")[0] + "CallFlow/server/main.py"
    server_cmd = ["python3", cwd] + args
    launch_cmd(server_cmd, alias="server")

    """
    Launch callflow app server.
    """
    print("Launching client")
    cwd = os.getcwd().split("CallFlow")[0] + "CallFlow/app"
    prefix_string = ["--silent", "--prefix=" + cwd]
    client_cmd = ["npm", "run", "dev"] + prefix_string
    print(client_cmd)
    launch_cmd(client_cmd, alias="client")

    return StartLaunched(info="Started")


def launch_cmd(cmd, timeout=datetime.timedelta(seconds=60), alias=""):
    """
    Launch a cmd.
    """
    stdprefix_path = "/tmp/.callflow-info/" + alias + "-"
    (stdout_fd, stdout_path) = tempfile.mkstemp(prefix=stdprefix_path + "stdout-")
    (stderr_fd, stderr_path) = tempfile.mkstemp(prefix=stdprefix_path + "stderr-")

    start_time_seconds = time.time()
    try:
        p = subprocess.Popen(cmd, stdout=stdout_fd, stderr=stderr_fd,)
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
            return StartFailed(
                exit_code=subprocess_result,
                stdout=_maybe_read_file(stdout_path),
                stderr=_maybe_read_file(stderr_path),
            )
            # for info in get_launch_information():
            # if info.pid == p.pid and info.start_time >= start_time_seconds:
            info = get_launch_information()
            return StartLaunched(
                info={"out_path": stdout_path, "err_path": stderr_path, "pid": p.pid,}
            )
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
            return infile.read()
    except IOError as e:
        if e.errno == errno.ENOENT:
            return None
