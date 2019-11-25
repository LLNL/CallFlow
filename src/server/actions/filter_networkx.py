import numpy as np
import networkx as nx

class FilterNetworkX():
    def __init__(self, state):
        self.df = state.df
        self.dataset_df = self.df.groupby(['dataset'])
        self.dataset_idx = {}
        self.set_max_min_times()
    
    def set_max_min_times(self):
        self.max_time_inc_list = np.array([])
        self.min_time_inc_list = np.array([])
        self.max_time_exc_list = np.array([])
        self.min_time_exc_list = np.array([])
        count = 0
        for dataset, df in self.dataset_df:
            self.dataset_idx[dataset] = count
            self.max_time_inc_list = np.hstack([self.max_time_inc_list, df['time (inc)'].max()])
            self.min_time_inc_list = np.hstack([self.min_time_inc_list, df['time (inc)'].min()])
            self.max_time_exc_list = np.hstack([self.max_time_exc_list, df['time'].max()])
            self.min_time_exc_list = np.hstack([self.min_time_exc_list, df['time'].min()])
            count += 1
        print("Dataset idx: ", self.dataset_idx)
        print("Min. time (inc): ", self.min_time_inc_list)
        print("Max. time (inc): ", self.max_time_inc_list)
        print("Min. time (exc): ", self.min_time_exc_list)
        print("Max. time (exc): ", self.max_time_exc_list)
        self.max_time_inc = np.max(self.max_time_inc_list)
        self.min_time_inc = np.min(self.min_time_inc_list)
        self.max_time_exc = np.max(self.max_time_exc_list)
        self.min_time_exc = np.min(self.min_time_exc_list)
        
    def filter_time_inc_overall(self, perc):
        df = self.df.loc[(self.df['time (inc)'] > perc*0.01*self.max_time_inc)]
        filter_call_sites = df['name'].unique()
        print("Number of nodes left in dataframe: ", len(filter_call_sites))
        return df[df['name'].isin(filter_call_sites)]

    def filter_graph_nodes(self, df, g):
        call_sites = df['name'].unique()

        ret = nx.DiGraph()

        for edge in g.edges():
            if edge[0] in call_sites and edge[1] in call_sites:
                ret.add_edge(edge[0], edge[1])

        # self.add_node_attributes(df, ret)
        return ret

    def generic_map(self, df, g):
        df = df.reset_index(['rank'])
        columns = list(df.columns)
        for column in columns:
            values = {}
            non_unique_columns = ['time', 'time (inc)', 'dataset', 'rank']
            for node in g.nodes():
                name_df = df.loc[df['name'] == node][column]
                if column in non_unique_columns:
                    values[node] = name_df.tolist()
                else:
                    values[node] = name_df.tolist()[0]
            nx.set_node_attributes(g, name=column, values = values)
    
    def add_node_attributes(self, df, g):            
        generic_map = self.generic_map(df, g)