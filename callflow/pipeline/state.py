import os
#from hatchet import *

from callflow import GraphFrame

class State(object):

    # TODO: Assign self.g, self.root...
    def __init__(self, dataset_name):

        # it appears we're using name as "union", "filter", etc.
        # this is not a data set name!
        self.name = dataset_name

        # instead of the old variables, we will use these new ones.
        # these are callflow.graphframe object (has gf, df, and networkx)
        self.new_gf = None
        self.new_entire_gf = None

        # these are the old variables
        #self.entire_g = None
        #self.entire_df = None
        #self.entire_graph = None
        #self.g = None
        #self.df = None
        #self.gf = None
        #self.graph = None

        # I cant see where these are used..
        #self.roots = None
        #self.map = None
        #self.node_hash_map = {}
        self.projection_data = {}

    '''
    def lookup_by_column(self, _hash, col_name):
        # dont think this is used anywhere
        assert False

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
    '''
    def lookup(self, node):
        return self.new_gf.lookup(node)
        #return self.df.loc[
        #    (self.df["name"] == node.callpath[-1]) & (self.df["nid"] == node.nid)
        #]

    def lookup_with_node(self, node):
        return self.new_gf.lookup_with_node(node)
        #return self.df.loc[self.df["name"] == node.callpath[-1]]

    def lookup_with_name(self, name):
        return self.new_gf.lookup_with_name(node)
        #return self.df.loc[self.df["name"] == name]

    def lookup_with_vis_nodeName(self, name):
        return self.new_gf.lookup_with_name(node)
        #return self.df.loc[self.df["vis_node_name"] == name]

    def update_df(self, col_name, mapping):
        return self.new_gf.update_df(col_name, mapping)
        '''
        self.df[col_name] = self.df["name"].apply(
            lambda node: mapping[node] if node in mapping.keys() else ""
        )
        '''

    def grouped_df(self, attr):
        self.gdf[attr] = self.new_gf.df.groupby(attr, as_index=True, squeeze=True)
        self.gdfKeys = self.gdf[attr].groups.keys()
