# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
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
CALLFLOW_DIR = os.path.dirname(os.path.abspath(__file__))


# ------------------------------------------------------------------------------
def main():

    log_level = 1 if '--verbose' in sys.argv else 2
    callflow.init_logger(level=log_level)

    # --------------------------------------------------------------------------
    args = ArgParser(sys.argv)
    debug = args.args['verbose']
    production = args.args['production']
    process = args.args['process']
    endpoint_access = args.args.get('endpoint_access', 'REST')
    endpoint_env = args.args.get('endpoint_env', 'TERMINAL')

    assert endpoint_access in ["REST", "SOCKETS"]
    assert endpoint_env in ['TERMINAL', 'JUPYTER']

    # endpoint_access = 'JUPYTER'

    # --------------------------------------------------------------------------
    # process and exit
    if process:
        assert endpoint_env == "TERMINAL"
        cf = BaseProvider(config=args.config)
        cf.process()

    # --------------------------------------------------------------------------
    elif not process and endpoint_access == "TERMINAL":
        if endpoint_access == "REST":
            cf = APIProvider(config=args.config)
        else:
            cf = SocketProvider(config=args.config)
        cf.load()
        cf.start(host=CALLFLOW_APP_HOST, port=CALLFLOW_APP_PORT)

    # --------------------------------------------------------------------------
    elif not process and endpoint_access == "JUPYTER":
        launch_ipython(args.args, args.config,
                       host=CALLFLOW_APP_HOST, port=CALLFLOW_APP_PORT)

    # --------------------------------------------------------------------------
    else:
        s = f'Invalid options ' \
            f'(process={process}, access={endpoint_access}, env={endpoint_env})'
        raise Exception(s)

    # --------------------------------------------------------------------------


# --------------------------------------------------------------------------
if __name__ == "__main__":
    main()

# ------------------------------------------------------------------------------
