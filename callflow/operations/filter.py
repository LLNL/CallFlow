# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np
#import networkx as nx
#from ast import literal_eval as make_list

import callflow
LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class Filter:

    VALID_MODES = ["time", "time (inc)"]

    def __init__(self, gf, mode="single",
                 filter_by="time (inc)", filter_perc=10.):

        assert isinstance(gf, callflow.GraphFrame)
        assert isinstance(filter_by, str) and isinstance(filter_perc, (int, float))
        assert filter_by in Filter.VALID_MODES
        assert 0. <= filter_perc <= 100.

        self.gf = gf
        self.filter_by = filter_by
        self.filter_perc = filter_perc

        # ----------------------------------------------------------------------
        # compute the min/max
        #self.set_max_min_times()
        _mn, _mx = self.gf.df_minmax("time (inc)")
        self.min_time_inc_list = np.array([_mn])
        self.max_time_inc_list = np.array([_mx])

        _mn, _mx = self.gf.df_minmax("time")
        self.min_time_exc_list = np.array([_mn])
        self.max_time_exc_list = np.array([_mx])

        LOGGER.info(f"Min. time (inc): {self.min_time_inc_list}")
        LOGGER.info(f"Max. time (inc): {self.max_time_inc_list}")
        LOGGER.info(f"Min. time (exc): {self.min_time_exc_list}")
        LOGGER.info(f"Max. time (exc): {self.max_time_exc_list}")

        self.max_time_inc = np.max(self.max_time_inc_list)
        self.min_time_inc = np.min(self.min_time_inc_list)
        self.max_time_exc = np.max(self.max_time_exc_list)
        self.min_time_exc = np.min(self.min_time_exc_list)

        # ----------------------------------------------------------------------
        if filter_by == "time (inc)":
            value = self.filter_perc * 0.01 * self.max_time_inc
            LOGGER.debug(f"[Filter] By \"{filter_by}\": {self.filter_perc}\% ==> {value}")

            self.gf.filter_gf(filter_by, value)
            #self.gf.df = self.df_by_time_inc()
            #self.gf.nxg = self.graph_by_time_inc()

        elif filter_by == "time":
            value = self.filter_perc
            LOGGER.debug(f"[Filter] By \"{filter_by}\": {self.filter_perc}\% ==> {value}")

            self.gf.filter_gf(filter_by, value)
            #self.gf.df = self.df_by_time()
            #self.gf.nxg = self.graph_by_time()

    '''
    def set_max_min_times(self):

        self.max_time_inc_list = np.array([])
        self.min_time_inc_list = np.array([])
        self.max_time_exc_list = np.array([])
        self.min_time_exc_list = np.array([])

        self.max_time_inc_list = np.hstack(
            [self.max_time_inc_list, self.gf.df["time (inc)"].max()]
        )
        self.min_time_inc_list = np.hstack(
            [self.min_time_inc_list, self.gf.df["time (inc)"].min()]
        )
        self.max_time_exc_list = np.hstack(
            [self.max_time_exc_list, self.gf.df["time"].max()]
        )
        self.min_time_exc_list = np.hstack(
            [self.min_time_exc_list, self.gf.df["time"].min()]
        )
        
        LOGGER.info(f"Min. time (inc): {self.min_time_inc_list}")
        LOGGER.info(f"Max. time (inc): {self.max_time_inc_list}")
        LOGGER.info(f"Min. time (exc): {self.min_time_exc_list}")
        LOGGER.info(f"Max. time (exc): {self.max_time_exc_list}")

        
        self.max_time_inc = np.max(self.max_time_inc_list)
        self.min_time_inc = np.min(self.min_time_inc_list)
        self.max_time_exc = np.max(self.max_time_exc_list)
        self.min_time_exc = np.min(self.min_time_exc_list)
    
    def df_by_time_inc(self):
        LOGGER.debug(f"[Filter] By Inclusive time : {self.filter_perc}")
        df = self.gf.df.loc[
            (self.gf.df["time (inc)"] > self.filter_perc * 0.01 * self.max_time_inc)
        ]
        filter_call_sites = df["name"].unique()
        return df[df["name"].isin(filter_call_sites)]

    def df_by_time(self, perc):
        LOGGER.debug(f"[Filter] By Exclusive time : {self.filter_perc}")
        df = self.gf.df.loc[self.gf.df["time"] > self.filter_perc]
        filter_call_sites = df["name"].unique()
        return df[df["name"].isin(filter_call_sites)]

    def graph_by_time_inc(self):
        callsites = self.gf.df["name"].unique()

        ret = nx.DiGraph()
        for edge in self.gf.nxg.edges():
            # If source is present in the callsites list
            if edge[0] in callsites and edge[1] in callsites:
                ret.add_edge(edge[0], edge[1])
            else:
                LOGGER.debug(f"Removing the edge: {edge}")

        return ret

    def findPaths(self, g, u, n, excludeSet=None):
        if excludeSet is None:
            excludeSet = set([u])
        else:
            excludeSet.add(u)
        if n == 0:
            return [[u]]

        paths = [
            [].append(path)
            for neighbor in g.neighbors(u)
            if neighbor not in excludeSet
            for path in self.findPaths(g, neighbor, n - 1, excludeSet)
        ]
        excludeSet.remove(u)
        return paths
    
    def graph_by_time(self, df, g):
        callsites = df["name"].unique()

        ret = nx.DiGraph()

        for callsite in callsites:
            path = df.loc[df["name"] == callsite]["path"].tolist()[0]
            path = make_list(path)
            ret.add_path(path)

        return ret
    '''