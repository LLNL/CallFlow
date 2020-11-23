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
        LOGGER.debug(f"[Socket request] init: {data}")
        if data["mode"] == "Ensemble":
            result = self.callflow.request_ensemble({"name": "init"})
        elif data["mode"] == "Single":
            result = self.callflow.request_single({"name": "init"})
        else:
            result = {}
        return result

    @staticmethod
    def config():
        """
        /config endpoint
        """
        result = self.callflow.request_single({"name": "init"})
        return result