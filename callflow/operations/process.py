# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np
import pandas as pd
from scipy.stats import kurtosis, skew

import callflow
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

            self.graphMapper()

        def convertFrameList(self, nodes):
            return [_.frame.get("name") for _ in nodes]
            '''
            ret = []
            for node in nodes:
                ret.append(node.frame.get("name"))
            return ret
            '''

        def graphMapper(self):
            self.callers = {}
            self.callees = {}
            self.paths = {}
            self.hatchet_nodes = {}

            for node in self.gf.graph.traverse():
                node_dict = callflow.utils.node_dict_from_frame(node.frame)

                if node_dict["type"] == "loop":
                    node_name = "Loop@" + callflow.utils.sanitize_name(
                        node_dict["name"] + ":" + str(node_dict["line"])
                    )
                elif node_dict["type"] == "statement":
                    node_name = (
                        callflow.utils.sanitize_name(node_dict["name"])
                        + ":"
                        + str(node_dict["line"])
                    )
                else:
                    node_name = node_dict["name"]

                node_paths = node.paths()
                self.paths[node_name] = node_paths
                self.callers[node_name] = self.convertFrameList(node.parents)
                self.callees[node_name] = self.convertFrameList(node.children)
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
                                f"graph contains: {df_node_count} nodes" )

            self.gf.df_add_column('path',
                                  apply_func=lambda _: callflow.utils.path_list_from_frames(self.paths[_]))
            '''
            self.raiseExceptionIfNodeCountNotEqual(self.paths)
            self.gf.df["path"] = self.gf.df["name"].apply(
                lambda node_name: callflow.utils.path_list_from_frames(
                    self.paths[node_name]
                )
            )
            '''
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
            for node_name in self.gf.df["name"].unique():

                node_df = self.gf.lookup_with_name(node_name)
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

            '''
            inclusive = {}
            exclusive = {}
            std_deviation_inclusive = {}
            std_deviation_exclusive = {}

            skewness_inclusive = {}
            skewness_exclusive = {}

            kurtosis_inclusive = {}
            kurtosis_exclusive = {}

            for node_name in self.gf.df["name"].unique():
                node_df = self.gf.df.loc[self.gf.df["name"] == node_name]

                # TODO: this is a bug!
                max_incTime = node_df["time"].mean()
                mean_incTime = node_df["time (inc)"].mean()

                max_excTime = node_df["time"].max()
                mean_excTime = node_df["time"].mean()

                if mean_incTime == 0.0:
                    mean_incTime = 1.0

                inclusive[node_name] = (max_incTime - mean_incTime) / mean_incTime
                exclusive[node_name] = (max_excTime - mean_excTime) / mean_excTime

                if len(node_df.index) == 1:
                    _sti, _ste = 0., 0.
                else:
                    _sti = np.std(node_df["time (inc)"].tolist(), ddof=1)
                    _ste = np.std(node_df["time"].tolist(), ddof=1)

                std_deviation_inclusive[node_name] = _sti
                std_deviation_exclusive[node_name] = _ste

                # TODO: why converting them to lists again and again
                skewness_inclusive[node_name] = skew(node_df["time (inc)"].tolist())
                skewness_exclusive[node_name] = skew(node_df["time"].tolist())

                kurtosis_inclusive[node_name] = kurtosis(node_df["time (inc)"].tolist())
                kurtosis_exclusive[node_name] = kurtosis(node_df["time"].tolist())

            self.gf.df["imbalance_perc_inclusive"] = self.gf.df["name"].apply(
                lambda name: inclusive[name]
            )
            self.gf.df["imbalance_perc_exclusive"] = self.gf.df["name"].apply(
                lambda name: exclusive[name]
            )

            self.gf.df["std_deviation_inclusive"] = self.gf.df["name"].apply(
                lambda name: std_deviation_inclusive[name]
            )
            self.gf.df["std_deviation_exclusive"] = self.gf.df["name"].apply(
                lambda name: std_deviation_exclusive[name]
            )

            self.gf.df["skewness_inclusive"] = self.gf.df["name"].apply(
                lambda name: skewness_inclusive[name]
            )
            self.gf.df["skewness_exclusive"] = self.gf.df["name"].apply(
                lambda name: skewness_exclusive[name]
            )

            self.gf.df["kurtosis_inclusive"] = self.gf.df["name"].apply(
                lambda name: kurtosis_inclusive[name]
            )
            self.gf.df["kurtosis_exclusive"] = self.gf.df["name"].apply(
                lambda name: kurtosis_exclusive[name]
            )
            return self
            '''

        def add_callers_and_callees(self):
            self.gf.df_add_column('callees', apply_func=lambda _: self.callees[_])
            self.gf.df_add_column('callers', apply_func=lambda _: self.callers[_])

            '''
            self.gf.df["callees"] = self.gf.df["name"].apply(
                lambda node: self.callees[node]
            )
            self.gf.df["callers"] = self.gf.df["name"].apply(
                lambda node: self.callers[node]
            )
            '''
            return self

        # node_name is different from name in dataframe. So creating a copy of it.
        def add_vis_node_name(self):
            self.module_group_df = self.gf.df.groupby(["module"])
            self.module_callsite_map = self.module_group_df["name"].unique()

            self.name_group_df = self.gf.df.groupby(["name"])
            self.callsite_module_map = self.name_group_df["module"].unique().to_dict()

            self.gf.df_add_column('vis_node_name',
                                  apply_func=lambda _:
                                  callflow.utils.sanitize_name(self.callsite_module_map[_][0]) + "=" + _)

            '''
            self.gf.df["vis_node_name"] = self.gf.df["name"].apply(
                lambda name: callflow.utils.sanitize_name(
                    self.callsite_module_map[name][0]
                )
                + "="
                + name
            )
            '''
            return self

        def add_node_name_hpctoolkit(self, node_name_map):
            self.gf.df_add_column('node_name', apply_func=lambda _: node_name_map[_])
            '''
            self.gf.df["node_name"] = self.gf.df["name"].apply(
                lambda name: node_name_map[name]
            )
            '''
            return self

        def add_module_name_hpctoolkit(self):
            self.gf.df_add_column('module',
                                  apply_func=lambda _: callflow.utils.sanitize_name(_),
                                  apply_on='module')
            '''
            self.gf.df["module"] = self.gf.df["module"].apply(
                lambda name: callflow.utils.sanitize_name(name)
            )
            '''
            return self

        def add_module_name_caliper(self, module_map):
            self.gf.df_add_column('module', apply_func=lambda _: module_map[_])
            '''
            self.gf.df["module"] = self.gf.df["name"].apply(
                 lambda name: module_map[name]
            )
            '''
            return self

        def add_dataset_name(self):
            self.gf.df_add_column('dataset', value=self.tag)
            '''
            self.gf.df["dataset"] = self.tag
            '''
            return self

        def add_rank_column(self):
            self.gf.df_add_column('rank', value=0)
            self.add_nid_column()
            '''
            if "rank" not in self.gf.df.columns:
                self.gf.df["rank"] = 0
            '''
            return self

        def add_nid_column(self):
            if "nid" not in self.gf.df.columns:
                self.gf.df["nid"] = self.gf.df.groupby("name")["name"].transform(
                    lambda x: pd.factorize(x)[0]
                )
                assert False
            return self

        def add_time_columns(self):
            self.gf.df_add_time_proxies()
            '''
            if "time (inc)" not in self.gf.df.columns:
                self.gf.df["time (inc)"] = self.gf.df["inclusive#time.duration"]

            if (
                "time" not in self.gf.df.columns
                and "sum#time.duration" in self.gf.df.columns
            ):
                self.gf.df["time"] = self.gf.df["sum#time.duration"]

            if (
                "time" not in self.gf.df.columns
                and "sum#sum#time.duration" in self.gf.df.columns
            ):
                self.gf.df["time"] = self.gf.df["sum#sum#time.duration"]
            '''
            return self

        def create_name_module_map(self):
            self.gf.df_add_column("module", apply_func=lambda _: _)
            '''
            if "module" not in self.gf.df.columns:
                self.gf.df["module"] = self.gf.df["name"]
                self.gf.df["module2"] = self.gf.df["name"].apply(
                 lambda name: name)
            '''

            self.name_module_map = (
                self.gf.df.groupby(["name"])["module"].unique().to_dict()
            )

            return self

        '''
        def raiseExceptionIfNodeCountNotEqual(self, attr):
            map_node_count = len(attr.keys())
            df_node_count = len(self.gf.df["name"].unique())
            LOGGER.debug(
                f"[Validation] Map contains: {map_node_count} callsites, graph contains: {df_node_count} callsites"
            )
            if map_node_count != df_node_count:
                raise Exception(
                    f"Unmatched Preprocessing maps: Map contains: {map_node_count} nodes, graph contains: {df_node_count} nodes"
                )
        '''