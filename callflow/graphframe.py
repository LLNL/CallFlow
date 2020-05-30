import os

import hatchet as ht
from callflow.utils.logger import Log

class GraphFrame(ht.GraphFrame):

    def __init__(self, graph=None, dataframe=None,
                       exc_metrics=None, inc_metrics=None):

        #TODO: will we ever want to create a graphframe without data?
        if graph is not None and dataframe is not None:
            super().__init__(graph, dataframe, exc_metrics, inc_metrics)

            # shortcut!
            self.df = self.dataframe

        # save a networkx graph
        self.nxg = None

    # --------------------------------------------------------------------------
    # promote a hatchet graph frame to callflow graph frame
    @staticmethod
    def from_hatchet(gf):

        assert isinstance(gf, ht.GraphFrame)
        return GraphFrame(gf.graph, gf.dataframe, gf.exc_metrics, gf.inc_metrics)

    # create a graph frame directly from the config
    @staticmethod
    def from_config(config, name):

        # TODO: not proper use of logger
        log = Log("create_graphframe")
        log.info(f"Creating graphframes: {name}")
        log.info(f"Data path: {config.data_path}")

        if config.format[name] == "hpctoolkit":
            gf = ht.GraphFrame.from_hpctoolkit(config.data_path)

        elif config.format[name] == "caliper":
            gf = ht.GraphFrame.from_caliper(config.data_path)

        elif config.format[name] == "caliper_json":
            gf = ht.GraphFrame.from_caliper(config.data_path, query="")

        elif config.format[name] == "gprof":
            gf = ht.GraphFrame.from_grof_dot(config.data_path)

        elif config.format[name] == "literal":
            gf = ht.GraphFrame.from_literal(config.data_path)

        elif config.format[name] == "lists":
            gf = ht.GraphFrame.from_lists(config.data_path)

        return GraphFrame.from_hatchet(gf)

    # --------------------------------------------------------------------------
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

    '''
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
    '''
    # --------------------------------------------------------------------------
    def update_df(self, col_name, mapping):
        self.df[col_name] = self.df["name"].apply(
            lambda node: mapping[node] if node in mapping.keys() else ""
        )

    def grouped_df(self, attr):
        pass
        '''
        self.gdf[attr] = self.df.groupby(attr, as_index=True, squeeze=True)
        self.gdfKeys = self.gdf[attr].groups.keys()
        '''

    # --------------------------------------------------------------------------
