# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's operation to filter a super graph using runtime threshold's.
"""
import numpy as np
import networkx as nx
from ast import literal_eval as make_list

import callflow
from callflow.utils.df import *

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

        # self.callsites = df_unique(sg.dataframe, "name")
        # LOGGER.info(f"Number of callsites before QueryMatcher: {len(self.callsites)}")       
        
        # # Filter the graphframe using hatchet (initial filtering) using QueryMatcher.
        # query = [
        #     ("*", {f"{self.sg.df_get_proxy(filter_by)}": f"> {filter_perc * 0.01 * self.sg.mean_root_inctime}"})
        # ]
        # LOGGER.debug(f"Query is :{query}")
        # # self.sg.gf.drop_index_levels()
        # fgf = self.sg.gf.filter(query)
        
        # self.f_callsites = df_unique(fgf.dataframe, "name")
        # LOGGER.info(f"Number of callsites in after QueryMatcher: {len(self.f_callsites)}")

        self.compute()
        
        # TODO: Find a better way to do this.
        self.sg.dataframe = self.dataframe
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

        if self.filter_by == "time (inc)":
            value = self.filter_perc * 0.01 * np.max(max_vals["time (inc)"])
            self._filter_sg(self.filter_by, value)

        elif self.filter_by == "time":
            value = self.filter_perc
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
        # self.dataframe = self.sg.df_filter_by_value(filter_by, filter_val)
        if len(self.sg.f_callsites) > 0:
            self.dataframe = self.sg.dataframe[self.sg.dataframe["name"].isin(self.sg.f_callsites)]
        LOGGER.info(f'Filtered dataframe comprises of: "{self.dataframe.shape}"')

        callsites = self.sg.f_callsites
        nxg = nx.DiGraph()

        if filter_by == "time (inc)":
            for edge in self.sg.nxg.edges():
                # If source is present in the callsites list
                if edge[0] in callsites and edge[1] in callsites:
                    nxg.add_edge(edge[0], edge[1])
                #else:
                #    LOGGER.debug(f"Removing the edge: {edge}")

        elif filter_by == "time":
            for callsite in callsites:
                path = self.sg.df_lookup_with_column("name", callsite)["path"].tolist()[
                    0
                ]
                path = make_list(path)
                nxg.add_path(path)

        self.nxg = nxg

# ------------------------------------------------------------------------------
