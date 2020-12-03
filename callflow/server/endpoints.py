# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# Library imports

import callflow
LOGGER = callflow.get_logger(__name__)

class Endpoints: 
    def __init__(self) -> None:
        pass

    @staticmethod
    def init(data):
        """
        /init endpoint
        """
        LOGGER.debug(f"[Request] init: {data}")
        print("here")
        return self.callflow.request_general({"name": "init"})