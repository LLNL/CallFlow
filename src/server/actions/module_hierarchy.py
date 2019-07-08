import pandas as pd
import time 
import networkx as nx
import utils

class moduleHierarchy:
    def __init__(self, state, module):
        self.entire_graph = state.entire_graph
        # self.gdf = state.gdf
        self.graph = state.graph
        self.df = state.df
        self.module = module
        self.hierarchy = nx.Graph()
        self.result = self.run()

    def add_paths(self, df, path_name):
        for idx, row in df.iterrows():
            path = row[path_name]
            if isinstance(path, str):
                path = make_tuple(row[path_name])
            self.hierarchy.add_path(path)      

    def generic_map(self, nodes, attr):
        ret = {}
        for node in nodes:          
            # if the node is a module.
            if node == self.module:
                if attr == 'time (inc)':
                    group_df = self.df.groupby(['module']).mean()
                    ret[node] = group_df.loc[node, 'time (inc)']
                else:
                    df = self.df.loc[self.df['module'] == node][attr]
                    if df.empty:
                        ret[node] = self.df[self.df['_module'] == node][attr]
                    else:
                        ret[node] = list(set(self.df[self.df['name'] == node][attr].tolist())) 
            else:
                if attr == 'time (inc)':
                    group_df = self.df.groupby(['name']).mean()
                    ret[node] = group_df.loc[node, 'time (inc)']
                else:
                    df = self.df.loc[self.df['name'] == node][attr]
                    if df.empty:
                        ret[node] = self.df[self.df['name'] == node][attr]
                    else:
                        ret[node] = list(set(self.df[self.df['name'] == node][attr].tolist()))            
        return ret

    def add_node_attributes(self):
        time_mapping = self.generic_map(self.hierarchy.nodes(), 'time (inc)')
        nx.set_node_attributes(self.hierarchy, name='time (inc)', values=time_mapping)

        time_inc_mapping = self.generic_map(self.hierarchy.nodes(), 'time')
        nx.set_node_attributes(self.hierarchy, name='time', values=time_mapping)

        imbalance_perc_mapping = self.generic_map(self.hierarchy.nodes(), 'imbalance_perc')
        nx.set_node_attributes(self.hierarchy, name='imbalance_perc', values=imbalance_perc_mapping)

        component_path_mapping = self.generic_map(self.hierarchy.nodes(), 'component_path')
        nx.set_node_attributes(self.hierarchy, name='component_path', values=component_path_mapping)

    def create_hierarchy_df(self, module):
        df = self.df
        meta_nodes = df.loc[df['_module'] == module]
        print(meta_nodes)
        if 'component_path' not in df.columns:
            utils.debug('Error: Component path not defined in the df')
        self.add_paths(meta_nodes, 'component_path')
        self.add_node_attributes()

        source_target_data = []
        paths = []
        for idx, func in enumerate(self.hierarchy.nodes()):
            if func == module:
                paths.append({
                    "name": func,
                    "path": [module],
                    "time (inc)": df.loc[df['_module'] == module]['time (inc)'].mean(),
                    "time": df.loc[df['_module'] == module]['time'].mean(),
                    "imbalance_perc": df.loc[df['_module'] == module]['imbalance_perc'].max(),
                    "level": 1
                })
            else:
                # component_path_df = df.loc[df['name'] == func]['component_path']
                # component_level_df = df.loc[df['name'] == func]['component_level']
                # component_level_group_df = df.groupby(['_module', 'component_level'])
                # for key, item in component_level_group_df:
                #     print(component_level_group_df.get_group(key), "\n\n")
                paths.append({
                    "name": func,
                    "path": list(df.loc[df['name'] == func]['component_path'].tolist()[0]),
                    "time (inc)": df.loc[df['name'] == func]['time (inc)'].mean(),
                    "time": df.loc[df['name'] == func]['time'].mean(),
                    "imbalance_perc": df.loc[df['name'] == func]['imbalance_perc'].max(),
                    "level": df.loc[df['name'] == func]['component_level'].max(),
                })
        paths_df = pd.DataFrame(paths)

        # max_level = paths_df['component_level'].max()
        # print("Max levels inside the node: {0}".format(max_level))
            
        print(paths_df)
        return paths_df.to_json(orient="columns")

    # instead of nid, get by module. nid seems very vulnerable rn. 
    def run(self):
        node = self.df.loc[self.df['module'] == self.module]
        modules = node['module'].values.tolist()

        module = modules[0]
        hierarchy_graph = self.create_hierarchy_df(module)

        return hierarchy_graph

        