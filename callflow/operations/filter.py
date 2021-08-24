# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's operation to filter a super graph using runtime threshold's.
"""
from ast import literal_eval as make_list
import numpy as np
import networkx as nx

import callflow
from callflow.utils.df import df_info
from callflow.utils.nxg import nxg_info

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
class Filter:
    """
    Filters a SuperGraph.
    """

    VALID_MODES = ["time", "time (inc)"]

    def __init__(self, sg, filter_by="time (inc)", filter_perc=10.0):
        """
        Constructor to the filter operation.
        :param sg: SuperGraph
        :param filter_by: filter by metric, can be "time (inc)" or "time"
        :param filter_perc: filter percentage
        """
        assert isinstance(sg, callflow.SuperGraph)
        assert isinstance(filter_by, str) and isinstance(filter_perc, (int, float))
        assert filter_by in Filter.VALID_MODES
        assert 0.0 <= filter_perc <= 100.0

        self.sg = sg
        self.filter_by = filter_by
        self.filter_perc = filter_perc
        LOGGER.info(
            f'Filtering ({self.sg}) by "{self.filter_by}" = {self.filter_perc}%'
        )

        # TODO: Since we factorize the name and module column after creating
        # the CallFlow.dataframe, we need to filter by the callsite indexes. 
        self.callsites = self.sg.callsites_idx

        # if 0:
        self.mean_root_inctime = self.sg.df_root_max_mean_runtime(
            self.sg.roots, "time (inc)"
        )

        # Formulate the hatchet query.
        query = [
            (
                "*",
                {
                    f"{self.sg.df_get_proxy(filter_by)}": f"> {filter_perc * 0.01 * self.mean_root_inctime}"
                },
            )
        ]

        LOGGER.info(f"Filtering GraphFrame by Hatchet Query :{query}")
        LOGGER.debug(f"Number of callsites before QueryMatcher: {len(self.callsites)}")

        self.callsites = self.sg.hatchet_filter_callsites_by_query(query)

        LOGGER.debug(f"Number of callsites after QueryMatcher: {len(self.callsites)}")
        LOGGER.info(
            f"Removed {len(self.sg.callsites_idx) - len(self.callsites)} callsites."
        )

        self.compute()
        LOGGER.info(f'Filtered graph: "{nxg_info(self.nxg)}"')
        self.sg.nxg = self.nxg

    # --------------------------------------------------------------------------
    def compute(self):
        """
        Filter the SuperGraph based on {filter_by} attribute and {filter_perc} percentage.
        """
        # compute the min/max
        min_vals = {}
        max_vals = {}
        for mode in Filter.VALID_MODES:
            _mn, _mx = self.sg.df_minmax(mode)
            min_vals[mode] = np.array([_mn])
            max_vals[mode] = np.array([_mx])
            LOGGER.debug(f"{mode}:  min = {_mn}, max = {_mx}")

        value = self.filter_perc * 0.01 * np.max(max_vals[self.filter_by])
        self._filter_sg(self.filter_by, value)

    # --------------------------------------------------------------------------
    def _filter_sg(self, filter_by, filter_val):
        """
        Performs in-place filtering based on parameters

        :param filter_by (str): Attribute to filter by. (can be "time" or "time (inc)"
        :param filter_val (int): Filter percentage
        :return nxg (networkx.graph):
        """
        LOGGER.debug(f'Filtering {self.__str__()}: "{filter_by}" <= {filter_val}')

        if len(self.callsites) > 0:
            self.sg.dataframe = self.sg.dataframe[
                self.sg.dataframe["name"].isin(self.callsites)
            ]
        LOGGER.info(f'Filtered dataframe: "{df_info(self.sg.dataframe)}"')

        nxg = nx.DiGraph()

        if filter_by == "time (inc)":
            for edge in self.sg.nxg.edges():
                edge0_idx = self.sg.get_idx(edge[0], 'callsite')
                edge1_idx = self.sg.get_idx(edge[1], 'callsite')
                # If source is present in the callsites list
                if (edge0_idx in self.callsites) and (edge1_idx in self.callsites):
                    nxg.add_edge(edge[0], edge[1])
                # else:
                #    LOGGER.debug(f"Removing the edge: {edge}")

        elif filter_by == "time":
            for callsite in self.callsites:
                path = self.sg.df_lookup_with_column("name", callsite)["path"].tolist()[
                    0
                ]
                path = make_list(path)
                nxg.add_path(path)

        self.nxg = nxg


# ------------------------------------------------------------------------------
