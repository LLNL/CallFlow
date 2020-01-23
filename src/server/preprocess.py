
##############################################################################
# Copyright (c) 2018-2019, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
#
# This file is part of Callflowt.
# Created by Suraj Kesavan <kesavan1@llnl.gov>.
# LLNL-CODE-741008. All rights reserved.
#
# For details, see: https://github.com/LLNL/Callflow
# Please also read the LICENSE file for the MIT License notice.
##############################################################################

import random
import utils
from logger import log
from functools import wraps

def tmp_wrap(func):
    @wraps(func)
    def tmp(*args, **kwargs):
        log.info("Preprocessing : {0}".format(func.__name__))
        return func(*args, **kwargs)
    return tmp

# Preprocess the dataframe
# Builder object
# Preprocess.add_X().add_Y().....
class PreProcess():
    def __init__(self, builder):
        self.graph = builder.graph
        self.df = builder.df
        self.gf = builder.gf

    def map(self):
        return self.map

    class Builder(object):
        def __init__(self, state, gf_type='filter'):
            self.state = state
            if(gf_type == 'filter'):
                self.gf = state.gf
                self.df = state.df
                self.graph = state.graph
            elif(gf_type  == 'entire'):
                self.gf = state.entire_gf
                self.df = state.entire_df
                self.graph = state.entire_graph
            self.map = {}

        def bfs(self):
            ret = {}
            node_count = 0
            root = self.graph.roots[0]
            node_gen = self.graph.roots[0].traverse()
            try:
                while root.callpath != None:
                    node_count += 1
                    root = next(node_gen)
                    ret[root.callpath[-1]] = root.df_index
            except StopIteration:
                pass
            finally:
                print("Total nodes in the graph", node_count)
                del root
            return ret

        def build(self):
            return PreProcess(self)

        # Add the path information from the node object
        @tmp_wrap
        def add_path(self):
            # self.df['path'] = self.df['node'].apply(lambda node: (node.callpath, node.nid))
            return self

        # def _map(self, attr, ):
        #     ret = {}
        #     for idx, row in self.df.iterrows():
        #         node_df = self.state.lookup_with_node(row.node)
        #         n_index = node_df['n_index'].tolist()
        #         p_incTime  = node_df[attr].tolist()
        #         for idx in range(len(n_index)):
        #             if n_index[idx] not in ret:
        #                 ret[n_index[idx]] = []
        #             ret[n_index[idx]].append(p_incTime[idx])
        #     return ret

        # @tmp_wrap
        # def add_incTime(self):
        #     self.map['time (inc)'] = self._map('time (inc)')
        #     return self

        # @tmp_wrap
        # def add_excTime(self):
        #     self.map['time'] = self._map('time')
        #     return self

        # Max of the inclusive Runtimes among all processes
        # node -> max([ inclusive times of process])
        @tmp_wrap
        def add_max_incTime(self):
            ret = {}

            for idx, row in self.df.iterrows():
                ret[str(row.nid)] = max(self.state.lookup(row.nid)['time (inc)'])

            self.map['max_incTime'] = ret
            self.df['max_incTime'] = self.df['node'].apply(lambda node: self.map['max_incTime'][str(node.nid)])
            return self

        # Avg of inclusive Runtimes among all processes
        # node -> avg([ inclusive times of process])
        @tmp_wrap
        def add_avg_incTime(self):
            ret = {}
            for idx, row in self.df.iterrows():
                ret[str(row.nid)] = utils.avg(self.state.lookup(row.nid)['time (inc)'])

            self.map['avg_incTime'] = ret
            self.df['avg_incTime'] = self.df['node'].apply(lambda node: self.map['avg_incTime'][str(node.nid)])

            return self

        # Imbalance percentage Series in the dataframe
        @tmp_wrap
        def add_imbalance_perc(self):
            ret = {}
            for idx, row in self.df.iterrows():
                max_incTime = self.df.loc[self.df['name'] == row['name']]['time (inc)'].max()
                avg_incTime = self.df.loc[self.df['name'] == row['name']]['time (inc)'].mean()
                if(max_incTime == 0.0):
                    max_incTime = 1.0
                ret[row.name] = (row['time (inc)'] - avg_incTime)/max_incTime

            self.df['imbalance_perc'] = self.df['node'].apply(lambda node: ret[node])
            return self

        @tmp_wrap
        def add_callers_and_callees(self):
            graph = self.graph
            callees = {}
            callers = {}
            path = {}
            module = {}

            for root in graph.roots:
                node_gen = root.traverse()

                root_df = root.path()
                callers[root_df] = []
                callees[root_df] = []

                try:
                    while root_df:
                        root = next(node_gen)
                        root_name = utils.getNodeName(root)
                        path[root_name] = utils.getNodeCallpath(root)
                        if root.parents:
                            for idx, parent in enumerate(root.parents):
                                parent_name = utils.getNodeName(parent)

                                if parent_name not in callees:
                                    callees[parent_name] = []

                                callees[parent_name].append(root_name)

                                if root_name not in callers:
                                    callers[root_name] = []
                                callers[root_df].append(parent_name)

                except StopIteration:
                    pass
                finally:
                    del root


            self.df['callees'] = self.df['name'].apply(lambda node: callees[node] if node in callees else [])
            self.df['callers'] = self.df['name'].apply(lambda node: callers[node] if node in callers else [])
            self.df['path'] = self.df['name'].apply(lambda node: path[node] if node in path else [])

            return self

        @tmp_wrap
        def add_show_node(self):
            self.map['show_node'] = {}
            self.df['show_node'] = self.df['name'].apply(lambda node: True)
            return self

        @tmp_wrap
        def update_show_node(self, show_node_map):
            self.map.show_node = show_node_map
            self.df['show_node'] = self.df['node'].apply(lambda node: show_node_map[str(node.df_index)])

        # node_name is different from name in dataframe. So creating a copy of it.
        @tmp_wrap
        def add_vis_node_name(self):
            self.df['vis_node_name'] = self.df['name'].apply(lambda name: name)
            return self

        @tmp_wrap
        def update_node_name(self, node_name_map):
            self.df['node_name'] = self.df['name'].apply(lambda name: self.config.name_module_map[name])

        @tmp_wrap
        def add_module_name(self, module_map):
            self.df['module'] = self.df['name'].apply(lambda name: module_map[name])
            return self

        @tmp_wrap
        def add_n_index(self):
            self.df['n_index'] = self.df.groupby('nid').ngroup()
            return self

        @tmp_wrap
        def add_mod_index(self):
            self.df['mod_index'] = self.df.groupby('module').ngroup()
            return self

        @tmp_wrap
        def add_dataset_name(self):
            self.df['dataset'] = self.state.name
            return self