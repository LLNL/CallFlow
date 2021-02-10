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
    print(f" ----------------- CallFlow {callflow.__version__} -----------------")

    # --------------------------------------------------------------------------

    log_level = 1 if "--verbose" in sys.argv else 2
    callflow.init_logger(level=log_level)

    # --------------------------------------------------------------------------
    args = ArgParser(sys.argv)
    debug = args.args["verbose"]
    production = args.args["production"]
    process = args.args["process"]
    endpoint_access = args.args.get("endpoint_access", "REST")
    endpoint_env = args.args.get("endpoint_env", "TERMINAL")

    assert endpoint_access in ["REST", "SOCKETS"]
    assert endpoint_env in ["TERMINAL", "JUPYTER"]

    # endpoint_access = 'JUPYTER'

    # --------------------------------------------------------------------------
    # process and exit
    if process:
        assert endpoint_env == "TERMINAL"
        cf = BaseProvider(config=args.config)
        cf.process()

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
