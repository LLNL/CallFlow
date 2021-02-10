# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's ensemble super graph.
"""
from callflow import get_logger
from .supergraph import SuperGraph

LOGGER = get_logger(__name__)


class EnsembleGraph(SuperGraph):
    "Ensemble SuperGraph Data structure"
    """
    EnsembleGraph represents a unified graph and all components supergraphs.
    """

    def __init__(self, name):
        """
        Constructor to Ensemble SuperGraph
        :param name: tag for the ensemble
        """
        super().__init__(name)

        self.supergraphs = {}
        self.dataframe = None
        self.nxg = None
        self.graph = None
        self.exc_metrics = []
        self.inc_metrics = []

    def __str__(self):
        """
        String representation for an ensemble super graph.
        :return:
        """
        return f"EnsembleGraph<{self.name} of {len(self.supergraphs)} supergraphs; df = {self.dataframe.shape}>"

    def __repr__(self):
        """
        String representation for an ensemble super graph.
        :return:
        """
        return self.__str__()


# ------------------------------------------------------------------------------
