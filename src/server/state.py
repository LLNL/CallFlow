from logger import log
import os
from hatchet import *

class State(object):
    # TODO: Assign self.g, self.root... 
    def __init__(self, config, name):
        self.config = config
        self.name = name
        self.callflow_path = os.path.abspath(os.path.join(__file__, '../../..'))
        self.path = os.path.abspath(os.path.join(self.callflow_path, self.config.paths[self.name]))
        self.g = None
        self.root = None

        self.gf = self.create_gfs()
        self.df = self.gf.dataframe
        self.graph = self.gf.graph
        self.node_hash_map = self.node_hash_mapper()
        
    # Loops over the config.paths and gets the graphframe from hatchet
    def create_gfs(self):
        log.info("[State] Creating graphframes: {0}".format(self.name))
        gf = GraphFrame()
        if self.config.format[self.name] == 'hpctoolkit':
            gf.from_hpctoolkit(self.path, int(self.config.nop[self.name]))
        elif self.config.format[self.name] == 'caliper':                
            gf.from_caliper(path)        
        return gf

    def node_hash_mapper(self):
        ret = {}
        for idx, row in self.df.iterrows():
            df_node_index = str(row.node.df_index)
            ret[df_node_index] = row.node
        return ret
    
    def lookup_by_column(self, _hash, col_name):
        ret = []
        node_df = self.df.loc[self.df['node'] == self.node_hash_map[str(_hash)]]
        node_df_T = node_df.T.squeeze()
        node_df_T_attr = node_df_T.loc[col_name]
        if node_df_T_attr is not None:
            if type(node_df_T_attr) is str or type(node_df_T_attr) is float:
                ret.append(node_df_T_attr)
            else:
                ret = node_df_T_attr.tolist()
        return ret
        
    def lookup(self, _hash):
        return self.df.loc[self.df['node'] == self.node_hash_map[str(_hash)]]

    def lookup_with_node(self, node):
        return self.df.loc[self.df['node'] == node]

    def lookup_with_nodeName(self, name):
        return self.df.loc[self.df['name'] == name]

    def lookup_with_vis_nodeName(self, name):
        return self.df.loc[self.df['vis_node_name'] == name]

    def update_df(self, col_name, mapping):
        self.df[col_name] = self.df['node'].apply(lambda node: mapping[node] if node in mapping.keys() else '')

    def lookup_with_df_index(self, df_index):
        return self.df.loc[self.df['df_index'] == df_index]
    
    def grouped_df(self, attr):
        self.gdf[attr] = self.df.groupby(attr, as_index=True, squeeze=True)  
        self.gdfKeys= self.gdf[attr].groups.keys()
