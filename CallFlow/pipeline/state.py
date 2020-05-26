import os
from hatchet import *


class State(object):
    # TODO: Assign self.g, self.root...
    def __init__(self, dataset_name):
        self.name = dataset_name
        self.g = None
        self.roots = None
        self.gf = None
        self.df = None
        self.entire_df = None
        self.graph = None
        self.entire_graph = None
        self.entire_g = None
        self.map = None
        self.node_hash_map = {}
        self.projection_data = {}

    def lookup_by_column(self, _hash, col_name):
        ret = []
        node_df = self.df.loc[self.df["node"] == self.map[str(_hash)]]
        node_df_T = node_df.T.squeeze()
        node_df_T_attr = node_df_T.loc[col_name]
        if node_df_T_attr is not None:
            if type(node_df_T_attr) is str or type(node_df_T_attr) is float:
                ret.append(node_df_T_attr)
            else:
                ret = node_df_T_attr.tolist()
        return ret

    def lookup(self, node):
        return self.df.loc[
            (self.df["name"] == node.callpath[-1]) & (self.df["nid"] == node.nid)
        ]

    def lookup_with_node(self, node):
        return self.df.loc[self.df["name"] == node.callpath[-1]]

    def lookup_with_name(self, name):
        return self.df.loc[self.df["name"] == name]

    def lookup_with_vis_nodeName(self, name):
        return self.df.loc[self.df["vis_node_name"] == name]

    def update_df(self, col_name, mapping):
        self.df[col_name] = self.df["name"].apply(
            lambda node: mapping[node] if node in mapping.keys() else ""
        )

    def grouped_df(self, attr):
        self.gdf[attr] = self.df.groupby(attr, as_index=True, squeeze=True)
        self.gdfKeys = self.gdf[attr].groups.keys()
