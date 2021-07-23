# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# ------------------------------------------------------------------------------
# General imports.
import os
import sys

# ------------------------------------------------------------------------------
# CallFlow local imports.
import callflow
from callflow.utils.argparser import ArgParser

from .provider_base import BaseProvider
from .provider_api import APIProvider
from .provider_socket import SocketProvider
from .notebook_server import launch_ipython

LOGGER = callflow.get_logger(__name__)

CALLFLOW_APP_HOST = os.getenv("CALLFLOW_APP_HOST", "127.0.0.1")
CALLFLOW_APP_PORT = int(os.getenv("CALLFLOW_APP_PORT", 5000))


# ------------------------------------------------------------------------------
def main():
    """
    Main function triggered by the `callflow` interface.
    Performs actions depending on the passed arguments
    :return: None
    """
    # --------------------------------------------------------------------------
    # scan the args for log file and log level
    nargs = len(sys.argv)
    log_file = ""
    for i in range(1, nargs):
        if sys.argv[i] != "--log":
            continue
        if i == nargs - 1:
            raise ValueError("Please provide a filename to go with --log option")
        log_file = sys.argv[i + 1]
        if log_file.startswith("--"):
            raise ValueError("Please provide a valid filename to go with --log option")
        break

    log_level = 1 if "--verbose" in sys.argv else 2
    mem_usage = "--verbose" in sys.argv     # show mem usage in verbose mode
    callflow.init_logger(level=log_level, file=log_file, mem_usage=mem_usage)

    # --------------------------------------------------------------------------
    LOGGER.info(f" ------- Initializing CallFlow {callflow.__version__} --------")

    # --------------------------------------------------------------------------
    args = ArgParser(sys.argv)
    debug = args.args["verbose"]  # noqa
    production = args.args["production"]  # noqa
    process = args.args["process"]
    endpoint_access = args.args.get("endpoint_access", "REST")
    endpoint_env = args.args.get("endpoint_env", "TERMINAL")
    reset = args.args["reset"]

    assert endpoint_access in ["REST", "SOCKETS"]
    assert endpoint_env in ["TERMINAL", "JUPYTER"]

    # --------------------------------------------------------------------------
    # process and exit
    if process:
        assert endpoint_env == "TERMINAL"
        cf = BaseProvider(config=args.config)
        cf.process(reset)

    # --------------------------------------------------------------------------
    # start a server based on endpoint_access = "REST" | "SOCKET"
    elif not process and endpoint_env == "TERMINAL":
        if endpoint_access == "REST":
            cf = APIProvider(config=args.config)
        else:
            cf = SocketProvider(config=args.config)
        cf.load()
        cf.start(host=CALLFLOW_APP_HOST, port=CALLFLOW_APP_PORT)

    # --------------------------------------------------------------------------
    # launch an ipython instance
    elif not process and endpoint_env == "JUPYTER":
        _launch_path = os.path.join(args.config["save_path"], "launch-info")
        launch_ipython(
            args.args,
            args.config,
            host=CALLFLOW_APP_HOST,
            port=CALLFLOW_APP_PORT,
            launch_path=_launch_path,
            app_version=callflow.__version__,
        )

    # --------------------------------------------------------------------------
    # Invalid options
    else:
        s = (
            f"Invalid options "
            f"(process={process}, access={endpoint_access}, env={endpoint_env})"
        )
        raise Exception(s)

    # --------------------------------------------------------------------------


# --------------------------------------------------------------------------
if __name__ == "__main__":
    main()

# ------------------------------------------------------------------------------
