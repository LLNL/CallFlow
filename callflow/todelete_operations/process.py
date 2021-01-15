# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np
import pandas as pd
from scipy.stats import kurtosis, skew

import callflow
from callflow.utils.utils import path_list_from_frames
from callflow.utils.sanitizer import Sanitizer
LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class Process:
    """
    Preprocess the dataframe
    Builder object
    Preprocess.add_X().add_Y().....
    """
    def __init__(self, gf, tag):
        self.gf = gf
        self.tag = tag

    class Builder(object):
        def __init__(self, gf, tag):
            self.gf = gf
            self.tag = tag

            self.callers = {}
            self.callees = {}
            self.paths = {}
            self.hatchet_nodes = {}

            for node in self.gf.graph.traverse():
                node_name = Sanitizer.from_htframe(node.frame)
                node_paths = node.paths()
                self.paths[node_name] = node_paths
                self.callers[node_name] = [_.frame.get("name") for _ in node.parents]
                self.callees[node_name] = [_.frame.get("name") for _ in node.children]
                self.hatchet_nodes[node_name] = node

        def build(self):
            return Process(self.gf, self.tag)

        # Add the path information from the node object
        def add_path(self):

            map_node_count = len(self.paths.keys())
            df_node_count = self.gf.df_count("name")

            if map_node_count != df_node_count:
                raise Exception(f"Unmatched Preprocessing maps: "
                                f"Map contains: {map_node_count} nodes, "
                                f"graph contains: {df_node_count} nodes")

            self.gf.df_add_column('path',
                                  apply_func=lambda _: path_list_from_frames(self.paths[_]))
            return self

        # Imbalance percentage Series in the dataframe
        def add_imbalance_perc(self):

            # compute these metrics
            metrics = ['imbalance_perc', 'std_deviation', 'skewness', 'kurtosis']

            # compute for these columns
            column_names = ["time (inc)", "time"]

            # name the new columns as these
            column_labels = ["inclusive", "exclusive"]

            # proxy columns for required columns
            column_proxies = [self.gf.df_get_proxy(_) for _ in column_names]

            metrics_dict = {}
            for node_name in self.gf.dataframe["name"].unique():

                node_df = self.gf.df_lookup_with_column("name", node_name)
                node_dfsz = len(node_df.index)

                metrics_dict[node_name] = {}
                for i, _proxy in enumerate(column_proxies):
                    _data = node_df[_proxy]

                    _mean, _max = _data.mean(), _data.max()
                    _perc = (_max-_mean)/_mean if not np.isclose(_mean, 0.) else _max
                    _std = np.std(_data, ddof=1) if node_dfsz > 1 else 0.
                    _skew = skew(_data)
                    _kert = kurtosis(_data)

                    # same order as metrics (not ideal, but OK)
                    metrics_dict[node_name][column_names[i]] = {}
                    for j, _val in enumerate([_perc, _std, _skew, _kert]):
                        metrics_dict[node_name][column_names[i]][metrics[j]] = _val

            # now, add these columns to the data frame
            for metric_key, col_suffix in zip(column_names, column_labels):
                for metric in metrics:
                    self.gf.df_add_column(f'{metric}_{col_suffix}',
                                          apply_func=lambda _: metrics_dict[_][metric_key][metric])

            return self

        def add_callers_and_callees(self):
            self.gf.df_add_column('callees', apply_func=lambda _: self.callees[_])
            self.gf.df_add_column('callers', apply_func=lambda _: self.callers[_])
            return self

        # node_name is different from name in dataframe. So creating a copy of it.
        def add_vis_node_name(self):
            self.module_group_df = self.gf.dataframe.groupby(["module"])
            self.module_callsite_map = self.module_group_df["name"].unique()

            self.name_group_df = self.gf.dataframe.groupby(["name"])
            self.callsite_module_map = self.name_group_df["module"].unique().to_dict()

            self.gf.df_add_column('vis_node_name',
                                  apply_func=lambda _:
                                  Sanitizer.sanitize(self.callsite_module_map[_][0]) + "=" + _)
            return self

        def add_node_name_hpctoolkit(self, node_name_map):
            self.gf.df_add_column('node_name', apply_func=lambda _: node_name_map[_])
            return self

        def add_module_name_hpctoolkit(self):
            self.gf.df_add_column('module',
                                  apply_func=lambda _: callflow.utils.sanitize_name(_),
                                  apply_on='module')
            return self

        def add_module_name_caliper(self, module_map):
            self.gf.df_add_column('module', apply_func=lambda _: module_map[_])
            return self

        def add_dataset_name(self):
            self.gf.df_add_column('dataset', value=self.tag)
            return self

        def add_rank_column(self):
            self.gf.df_add_column('rank', value=0)
            self.add_nid_column()
            return self

        def add_nid_column(self):
            if "nid" not in self.gf.dataframe.columns:
                self.gf.df["nid"] = self.gf.dataframe.groupby("name")["name"].transform(
                    lambda x: pd.factorize(x)[0]
                )
                assert False
            return self

        def add_time_columns(self):
            return self
            # this is now being called from the constructor
            self.gf.df_add_time_proxies()

        def create_name_module_map(self):
            self.gf.df_add_column("module", apply_func=lambda _: _)
            self.name_module_map = (
                self.gf.dataframe.groupby(["name"])["module"].unique().to_dict()
            )
            return self
