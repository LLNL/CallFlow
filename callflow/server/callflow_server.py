# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import os
import sys


# ------------------------------------------------------------------------------
import callflow
from callflow.utils.argparser import ArgParser


import callflow.server.manager as manager

from .provider_base import BaseProvider
from .provider_api import APIProvider
from .provider_socket import SocketProvider

LOGGER = callflow.get_logger(__name__)
CALLFLOW_APP_HOST = os.getenv("CALLFLOW_APP_HOST", "127.0.0.1")
CALLFLOW_APP_PORT = os.getenv("CALLFLOW_APP_PORT", "5000")


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

    def __init__(self, args):

        self.args = ArgParser(args)

        # Set cache key to store the current instance's arguments.
        # 
        self.cache_key = manager.cache_key(
            working_directory=os.getcwd(), arguments=self.args.args
        )

        self.debug = self.args.args['verbose']
        self.production = self.args.args['production']
        self.process = self.args.args['process']
        # TODO: link it to argParser
        # self.endpoint_access = self.args.args['endpoint_access']
        self.endpoint_access = "REST"

        assert self.endpoint_access in ["REST", "Sockets"]

        if self.process:
            cf = BaseProvider(config=self.args.config)
            cf.process()

        else:
            cf = None
            if self.endpoint_access == "REST":
                cf = APIProvider(config=self.args.config)
            else:
                cf = SocketProvider(config=self.args.config)
            cf.load()
            cf.start(host=CALLFLOW_APP_HOST, port=CALLFLOW_APP_PORT)


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
