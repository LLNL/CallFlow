# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# ------------------------------------------------------------------------------
# General imports.
import os
import json
import sys
import collections
import base64
import datetime

# ------------------------------------------------------------------------------
# IPython related imports.
import IPython
import time
import errno
import tempfile
import subprocess
import random

try:
    import html

    html_escape = html.escape
    del html
except ImportError:
    import cgi

    html_escape = cgi.escape
    del cgi

# ------------------------------------------------------------------------------
# CallFlow local imports.
import callflow
from callflow.utils.argparser import ArgParser


from .provider_base import BaseProvider
from .provider_api import APIProvider
from .provider_socket import SocketProvider

LOGGER = callflow.get_logger(__name__)
CALLFLOW_APP_HOST = os.getenv("CALLFLOW_APP_HOST", "127.0.0.1")
CALLFLOW_APP_PORT = os.getenv("CALLFLOW_APP_PORT", "5000")
CALLFLOW_DIR = os.path.dirname(os.path.abspath(__file__))

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
CALLFLOW_LAUNCH_INFO = collections.OrderedDict(
    (
        ("version", str),
        ("start_time", int),  # seconds since epoch
        ("pid", int),
        ("port", int), # port number
        ("host", str), # host IP
        ("config", str),  # may be empty
        ("cache_key", str),  # opaque, as given by `cache_key` below
    )
)

CallFlowLaunchInfo = collections.namedtuple(
    "CallFlowLaunchInfo",
    CALLFLOW_LAUNCH_INFO,
)

# ------------------------------------------------------------------------------
class CallFlowServer:
    """
    CallFlow Server:
        * Consumes the arguments passed and transfers to ArgParser class.
        * Stores a cache_key that holds information about the current launched
        instance.
        * Loads the CallFlow class.
        * `self.process` determines the mode to run the tool. 
            Process mode -- true (processing of datasets is performed.)
            Client mode -- false (loads the processed callflow.json and df.csv)
        * Create server using either APIProvider or SocketProvider  
    """

    def __init__(self, args, env: str = "TERMINAL"):
        """
        Constructor to the CallFlowServer class.
        TODO: Ensure we are able to process even using Jupyter notebook.
        Args:
            args: Arguments passed through terminal.
            env: 'TERMINAL' or 'JUPYTER'
        """
        self.args = ArgParser(args)
        self.debug = self.args.args['verbose']
        self.production = self.args.args['production']
        self.process = self.args.args['process']

        # TODO: link it to argParser
        # self.endpoint_access = self.args.args['endpoint_access']
        self.endpoint_access = "REST"
        assert self.endpoint_access in ["REST", "SOCKETS"]

        assert env in ['TERMINAL', 'JUPYTER']

        if self.process:
            cf = BaseProvider(config=self.args.config)
            cf.process()
        else:
            if self.endpoint_access == "REST":
                cf = APIProvider(config=self.args.config)
            else:
                cf = SocketProvider(config=self.args.config)
            cf.load()
            cf.start(host=CALLFLOW_APP_HOST, port=CALLFLOW_APP_PORT)
            if env == "JUPYTER":
                self.start_result = self.setup_ipython_environment(args_string=args)
                self.run_ipython_environment(start_result=self.start_result)

    def setup_ipython_environment(self, args_string):
        """
        Setup the IPython environment.

        :param args_string: Arguments (passed into CallFLow) as a string.
        :return: StartLaunched or StartReused
        """
        # Set cache key to store the current instance's arguments.
        cache_key = CallFlowServer._get_cache_key(working_directory=os.getcwd(), arguments=self.args.args)
        
        # Collect the version of CallFlow being executed.
        version = CallFlowServer._get_callflow_version() 

        # Launch information (CallFlowLaunchInfo) would be saved inside the config['save_path']
        launch_info_path = os.path.join(self.args.config["save_path"], "launch-info")

        # Create the launch info directory if needed. 
        info_dir = CallFlowServer._get_info_dir(launch_info_path)

        all_instances = CallFlowServer._find_all_instance(info_dir=info_dir)

        # Find a matching instance to the current launch.
        matching_instance = CallFlowServer._find_matching_instance(all_instances, info_dir)

        # If a match exists, use it.
        if matching_instance:
            start_result = StartReused(info=matching_instance)
            return start_result

        # Launch the server command 
        server_cmd = ["callflow_server"] + args_string
        CallFlowServer._launch_app(server_cmd, instance=matching_instance, info_dir=launch_info_path)

        # Construct the CallFlowLaunchInfo object.
        launch_info = CallFlowLaunchInfo(
            version=version,
            start_time=int(time.time()),
            port=CALLFLOW_APP_PORT,
            host=CALLFLOW_APP_HOST,
            pid=os.getpid(),
            config=self.args.config,
            cache_key=cache_key,
        )

        # Store the CallFlowLaunchInfo object.
        CallFlowServer._write_launch_info_file(launch_info)

        # Trigger a return that the callflow process has been triggered.
        start_result = StartLaunched(info="Started")

        return start_result

    def run_ipython_environment(self, start_result):
        """
        Run the jupyter environment

        :param start_result: StartLaunched or StartReused
        :return: None
        """
        handle = IPython.display.display(
            IPython.display.Pretty("Launching CallFlow..."),
            display_id=True,
        )

        if isinstance(self.start_result, StartLaunched):
            CallFlowServer._display_ipython(
                port=CALLFLOW_APP_PORT,
                height=800,
                display_handle=handle,
            )

        elif isinstance(start_result, StartReused):
            template = (
                "Reusing CallFlow's server is on port {port} and client is on {client_port} (pid {pid}), started {delta} ago. "
                "(Use '!kill {pid}' to kill it.)"
            )

            message = template.format(
                port=self.start_result.info["port"],
                pid=self.start_result.info["pid"],
                delta=CallFlowServer._time_delta_from_info(self.start_result.info),
            )

            CallFlowServer._print_message_in_jupyter(handle, message)

            CallFlowServer._display_ipython(
                port=self.start_result.info["client_port"], display_handle=None, height=800
            )

        return
    
    # ------------------------------------------------------------------------------
    # IPython notebook - Setup utilities.
    @staticmethod
    def _find_all_instance(info_dir):
        """
        Find all existing CallFlow instances.

        :param info_dir: Directory where the CallFlowInfo is stored.
        :return: all possible candidates that can be spawned.
        """
        launch_info = []
        for filename in os.listdir(info_dir):
            if filename.split("-")[0] == "pid":
                info={}
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

    @staticmethod
    def _find_matching_instance(instances, cache_key):
        """
        Find a matching instance for a given cache_key.

        :param instances: List of all CallFlowInfo instances.
        :param cache_key: Cache key that needs to be matched.
        :return: A `CalLFlowInfo` object, or `None` if none matches the cache key.
        """
        candidates = [info for info in instances if info["cache_key"] == cache_key]
        for candidate in sorted(candidates, key=lambda x: x["port"]):
            return candidate

    @staticmethod
    def _get_cache_key(working_directory, arguments):
        """
        Get a cache key for an CallFlowLaunchInfo instance.

        :param working_directory: Current working directory
        :param arguments:  Arguments passed during launch.
        :return:  a cache_key that encodes the input arguments used for comparing instances after launch.
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

    @staticmethod
    def _get_callflow_version():
        """
        Get the callflow version.
        :return: version
        """
        text = {}
        vfile = os.path.join(CALLFLOW_DIR, "..", "version.py")
        with open(vfile) as fp:
            exec(fp.read(), text)
            return text["__version__"]

    @staticmethod
    def _info_to_string(info):
        """
        Convert the CallFlow's launch info to json.

        :param info: CallFlowLaunchInfo instance
        :return: JSON representation for CallFlowLaunchInfo
        """
        json_value = {k: getattr(info, k) for k in CALLFLOW_LAUNCH_INFO}
        return json.dumps(json_value, sort_keys=True, indent=4)

    @staticmethod
    def _get_info_dir(path):
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

    @staticmethod
    def _get_info_file_path():
        """
        Get path to info file for the current process.
        As with `_get_info_dir`, the info directory will be created if it
        does not exist.
        """
        return os.path.join(CallFlowServer._get_info_dir(), "pid-%d.info" % os.getppid())

    @staticmethod
    def _read_launch_info_file(filename):
        """
        Read the given file, if it exists.

        :param filename: A path to a file.
        :return A string containing the file contents, or `None` if the file does not exist.
        """
        try:
            with open(filename) as infile:
                print(infile.read())
                return infile.read()
        except IOError as e:
            if e.errno == errno.ENOENT:
                return None

    @staticmethod
    def _write_launch_info_file(info):
        """
        Write CallFlowInfo to the current process's info file.
        This should be called by `main` once the server is ready. When the
        server shuts down, `remove_info_file` should be called.

        Raises:
           ValueError: If any field on `info` is not of the correct type.
        
        :param info: A valid `CallFlowLaunchInfo` object.
        """
        payload = "%s\n" % CallFlowServer._info_to_string(info)
        path = CallFlowServer._get_info_file_path()
        with open(path, "w") as outfile:
            outfile.write(payload)

    @staticmethod
    def _launch_app(cmd, info_dir, instance, timeout=datetime.timedelta(seconds=100)):
        """
        Launch the subprocess and the CallFlow app.
        :param cmd:
        :param info_dir:
        :param instance:
        :param timeout:
        :return:
        """
        (stdout_fd, stdout_path) = tempfile.mkstemp(prefix=info_dir + "stdout-")
        (stderr_fd, stderr_path) = tempfile.mkstemp(prefix=info_dir + "stderr-")
        pid_path = CallFlowServer._get_info_file_path()

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
                print(f"stdout is dumped in {stdout_path}.")
                print(f"stderr is dumped in {stdout_path}.")
                return StartFailed(
                    exit_code=subprocess_result,
                    stdout=CallFlowServer._read_launch_info_file(stdout_path),
                    stderr=CallFlowServer._read_launch_info_file(stderr_path),
                )
            else:
                return StartLaunched(info=instance)
        return StartTimedOut(pid=p.pid)

    @staticmethod
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

    @staticmethod
    def _time_delta_from_info(info):
        """
        Human-readable format for the elapsed time for the given CallFlowInstance.

        :param info: A CallFlowInfo instance.
        :return: A human-readable string describing the time since the server
            described by `info` started: e.g., "2 days, 0:48:58".
        """
        delta_seconds = int(time.time()) - info["start_time"]
        return str(datetime.timedelta(seconds=delta_seconds))

    @staticmethod
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
def main():

    log_level = 1 if '--verbose' in sys.argv else 2
    callflow.init_logger(level=log_level)

    # TODO: @HB do we need this out here?
    '''
    LOGGER.debug('debug logging')
    LOGGER.info('info logging')
    LOGGER.warning('warning logging')
    LOGGER.error('error logging')
    LOGGER.critical('critical logging')
    '''

    CallFlowServer(sys.argv)


if __name__ == "__main__":
    main()

# ------------------------------------------------------------------------------
