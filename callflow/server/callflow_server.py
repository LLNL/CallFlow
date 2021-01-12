# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

# ------------------------------------------------------------------------------
# Library imports
import os
import sys

# ------------------------------------------------------------------------------
# CallFlow imports.
import callflow
from callflow.operations import ArgParser
from callflow.server.api_provider import APIProvider
import callflow.server.manager as manager

# Globals
LOGGER = callflow.get_logger(__name__)
CALLFLOW_APP_HOST = os.getenv("CALLFLOW_APP_HOST", "127.0.0.1")
CALLFLOW_APP_PORT = os.getenv("CALLFLOW_APP_PORT", "5000")


# ------------------------------------------------------------------------------
class CallFlowServer:
    """
    CallFlow Server class.
    """

    def __init__(self, args):

        self.args = ArgParser(args)

        # Set cache key to store the current instance's arguments.
        self.cache_key = manager.cache_key(
            working_directory=os.getcwd(), arguments=self.args.args
        )

        self.debug = self.args.args['verbose']
        self.production = self.args.args['production']
        self.process = self.args.args['process']

        self.callflow = callflow.CallFlow(config=self.args.config)

        if self.process:
            self.callflow.process()
        else:
            self.callflow.load()

        # Create server if not processing.
        if not self.process:
            self._create_server()

    def _create_server(self):
        """
        Create server's request handler and starts the server.
        """
        APIProvider(
            cf=self.callflow,
            host=CALLFLOW_APP_HOST,
            port=CALLFLOW_APP_PORT,
        )

        if self.production:
            # TODO: CAL-6-enable-production-server
            pass


# ------------------------------------------------------------------------------
def main():

    log_level = 1 if '--verbose' in sys.argv else 2
    callflow.init_logger(level=log_level)
    CallFlowServer(sys.argv)


if __name__ == "__main__":
    main()

# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
