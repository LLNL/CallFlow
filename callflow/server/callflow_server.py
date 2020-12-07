# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# Library imports
import os

# ------------------------------------------------------------------------------
# CallFlow imports.
import callflow
from callflow.operations import ArgParser
from callflow.server.api_provider import APIProvider
import manager

# Globals
LOGGER = callflow.get_logger(__name__)
CALLFLOW_SERVER_HOST = "127.0.0.1"
CALLFLOW_SERVER_PORT = int(os.getenv("CALLFLOW_SERVER_PORT", 5000))


class CallFlowServer:
    """
    CallFlow Server class.
    """

    def __init__(self):
        self.args = ArgParser()

        # Set cache key to store the current instance's arguments.
        self.cache_key = manager.cache_key(
            working_directory=os.getcwd(), arguments=vars(self.args)
        )

        self.debug = True
        self.production = True
        self.process = self.args.process

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
        Current version abstracts the requests into 3 categores:
        General: common requests for both ensemble and single.
        Single: requests for single dataset processing.
        Ensemble: requests for ensemble dataset processing.
        """

        # Socket request handlers
        if len(self.args.config["parameter_props"]["runs"]) > 1:
            ensemble = True
        # SocketProvider(host=CALLFLOW_SERVER_HOST, port=CALLFLOW_SERVER_PORT, ensemble=ensemble)
        APIProvider(
            callflow=self.callflow,
            host=CALLFLOW_SERVER_HOST,
            port=CALLFLOW_SERVER_PORT,
            ensemble=ensemble,
        )

        # Start the server.
        if self.production:
            # TODO: CAL-6-enable-production-server
            pass


def main():
    # if verbose, level = 1
    # else, level = 2
    callflow.init_logger(level=2)
    CallFlowServer()


if __name__ == "__main__":
    main()
