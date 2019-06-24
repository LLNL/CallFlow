import pandas as pd
import time 
import networkx as nx
import utils

class moduleHierarchy:
    def __init__(self, state, nid):
        self.state = state 
        self.graph = state.graph
        self.df = state.df
        self.nid = nid
        self.run()

    def create_hierarchy_graph(self, module):
        g = self.state.entire_g
        hierarchy = nx.Graph()
        source_target_data = []
        
        nodes = [x for x,y in g.nodes(data=True) if 'module' in y and y['module'] == module]

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

    def run(self):
        node = self.df.loc[self.df['nid'] == self.nid]
        mod_index = node['mod_index'].values.tolist()
        print(mod_index)
        if len(mod_index) != 1:
            utils.debug("Something wrong!, A node cannot belong to two modules.")
            print(mod_index)
        else:
            mod_index = mod_index[0]
            # df = self.df.loc[self.df['mod_index'] == mod_index]
            module = node['module'].unique()[0]
            print(node['module'])
            is_exit = self.create_hierarchy_graph(module)
 
        paths = []
        func_in_module = self.df.loc[self.df['mod_index'] == mod_index]['name'].unique().tolist()
        print("Number of functions inside the {0} module: {1}".format(module, len(func_in_module)))
        print(func_in_module)
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