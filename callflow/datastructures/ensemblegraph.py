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

from callflow.modules import Gradients

LOGGER = get_logger(__name__)


# ------------------------------------------------------------------------------
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
        self.roots = []  # TODO: Populate this!
        self.module_df = None
        self.callsite_df = None

    def __str__(self):
        """
        String representation for an ensemble super graph.
        :return:
        """
        return (
            f"EnsembleGraph<{self.name} of {len(self.supergraphs)} supergraphs; "
            f"df = {self.dataframe.shape}, cols = {list(self.dataframe.columns)}>"
        )

    def __repr__(self):
        """
        String representation for an ensemble super graph.
        :return:
        """
        return self.__str__()

    def filter_by_datasets(self, selected_runs):
        """
        Filter by the selected runs
        :param selected_runs: Array of dataset tag names.
        :return: None
        """
        if selected_runs is not None:
            runs = selected_runs
            self.dataframe = self.df_filter_by_search_string("dataset", runs)
        else:
            runs = [name for name, sg in self.supergraphs.items()]
            self.dataframe = self.df_filter_by_search_string("dataset", runs)

        return runs

    def get_gradients(self, node, nbins):
        """
        Getter to obtain the gradients of a node by the runtime metrics.
        """
        assert self.name == "ensemble"

        return Gradients(
            self, node=node, bins=nbins, proxy_columns=self.proxy_columns
        ).result


# ------------------------------------------------------------------------------
