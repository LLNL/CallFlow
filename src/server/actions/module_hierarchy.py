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
        self.run()

    def add_paths(self, df, path_name):
        for idx, row in df.iterrows():
            if row.show_node:
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
        if 'component_path' not in df.columns:
            utils.debug('Error: Component path not defined in the df')
        self.add_paths(meta_nodes, 'component_path')
        self.add_node_attributes()

    def create_hierarchy_graph(self, module):
        g = self.entire_graph
        source_target_data = []
        
        nodes = [x for x, y in g.nodes(data=True) if 'module' in y and y['module'] == module]

        for idx, node in enumerate(nodes):
            neighbors = sorted(g[node].items(), key=lambda edge: edge[1]['weight'])
            for idx, n in enumerate(neighbors):
                print("source: {0}, target: {1}".format(node, n[0]))
                source_node = node
                target_node = n[0]
                weight = n[1]['weight']
                level = idx
                # if(cct_df[cct_df['name'] == n[0]]['module'].unique()[0] != module):
                #     type_node = 'exit'
                #     level = -1
                #     print('{0} is an exit node'.format(n[0]))
                # else:
                #     type_node = 'normal'
                #     source_target_data.append({
                #         "source": source_node,
                #         "target": target_node,
                #         "weight": weight,
                #         "level": level,
                #         "type": type_node
                #     })

                source_target_data.append({
                        "source": source_node,
                        "target": target_node,
                        "weight": weight,
                        "level": level,
                        "type": type_node
                    })
 
        isExit = {}
        for idx, data in enumerate(source_target_data):
            if data['level'] == -1:
                isExit[data['target']] = True
            else:
                isExit[data['target']] = False
        return isExit

    # instead of nid, get by module. nid seems very vulnerable rn. 
    def run(self):
        node = self.df.loc[self.df['module'] == self.module]
        modules = node['module'].values.tolist()

        module = modules[0]
        hierarchy_graph = self.create_hierarchy_df(module)

        return hierarchy_graph

        # for idx, func in enumerate(func_in_module):
        #     func_df = self.df.loc[self.df['name'] == func]
        #     if func not in is_exit:
        #         print(func)
        #         is_exit[func] = False
        #     else:
        #         is_exit[func] = True
        #     paths.append({
        #         "func": func,
        #         "exit": is_exit[func],
        #         "module": module,
        #         "path": func_df['component_path'].unique().tolist()[0],
        #         "inclusive" : func_df['time (inc)'].mean(),
        #         "exclusive" : func_df['time'].mean(),
        #         "imbalance_perc" : func_df['imbalance_perc'].mean(),
        #         "component_level": func_df['component_level'].unique().tolist()[0],
        #     })
        # paths_df = pd.DataFrame(paths)

        # max_level = paths_df['component_level'].max()
        # print("Max levels inside the node: {0}".format(max_level))
            
        # return paths_df.to_json(orient="columns")