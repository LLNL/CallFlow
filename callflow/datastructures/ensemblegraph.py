# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

from callflow import get_logger
from .supergraph import SuperGraph
LOGGER = get_logger(__name__)


# ------------------------------------------------------------------------------
# Ensemble SuperGraph Data structure
# ------------------------------------------------------------------------------
class EnsembleGraph(SuperGraph):
    """
    EnsembleGraph represents a unified graph and all components supergraphs.
    """

    # --------------------------------------------------------------------------
    def __init__(self, name):

        super().__init__(name)

        self.supergraphs = {}
        self.dataframe = None
        self.nxg = None
        self.graph = None
        self.exc_metrics = []
        self.inc_metrics = []

    def __str__(self):
        return f"EnsembleGraph<{self.name} of {len(self.supergraphs)} supergraphs; df = {self.dataframe.shape}>"

    def __repr__(self):
        return self.__str__()

# ------------------------------------------------------------------------------
