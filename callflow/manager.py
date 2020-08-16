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


def start(args, timeout=datetime.timedelta(seconds=60)):
    """
    Start a CallFlow (server and client) as a subprocess in the background.
    TODO: Improve logic to check if there is a callflow process already. 
    TODO: Fix the path not found error.
    """
    (stdout_fd, stdout_path) = tempfile.mkstemp(prefix=".callflow-stdout-")
    (stderr_fd, stderr_path) = tempfile.mkstemp(prefix=".callflow-stderr-")
    cwd = os.getcwd().split('CallFlow')[0] + "CallFlow/server/main.py"
    cmd = ["python3", cwd] + args
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

    poll_interval_seconds = 0.5
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
        # for info in get_all():
        #     if info.pid == p.pid and info.start_time >= start_time_seconds:
        return StartLaunched(info="Started" + stdout_path)
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
