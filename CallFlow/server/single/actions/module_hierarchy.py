import pandas as pd
import time
import networkx as nx
import utils
from utils.logger import log
from ast import literal_eval as make_tuple


class moduleHierarchy:
    def __init__(self, state, modFunc):
        self.graph = state.graph
        self.df = state.df

        self.modFunc = modFunc
        # Processing for the modFunc format to get the module name
        if '=' in modFunc:
            self.function = modFunc.split('=')[1]
            self.module = modFunc.split('=')[0]
        elif '/' in modFunc:
            self.function = modFunc.split('/')[1]
            self.module = modFunc.split('/')[0]

        # Create the Super node's hierarchy.
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
        for idx, node in enumerate(nodes):
            # idx = 0 in component path is the module.
            if idx == 0:
                corrected_node = node.split('=')[0]
                groupby = 'module'
            else:
                if "=" in node:
                    log.info('Super node: {0}'.format(node))
                    corrected_module = node.split('=')[0]
                    corrected_function = node.split('=')[1]
                    corrected_node = corrected_function
                    groupby = 'name'

                elif '/' in node:
                    log.info('Meta node: {0}'.format(node))
                    corrected_module = node.split('/')[0]
                    corrected_function = node.split('/')[1]
                    corrected_node = corrected_function
                    log.info("Getting dets of [module={0}], function={1}".format(corrected_module, corrected_node))
                    groupby = 'name'

                else:
                    log.info('Node: {0}'.format(node))
                    corrected_node = node
                    corrected_function = node
                    groupby = 'name'

            if attr == 'time (inc)':
                group_df = self.df.groupby([groupby]).max()
                ret[node] = group_df.loc[corrected_node, 'time (inc)']

            elif attr == 'entry_functions':
                module_df = self.df.loc[self.df['module'] == corrected_node]
                entry_func_df = module_df.loc[(module_df['component_level'] == 2)]
                if(entry_func_df.empty):
                    ret[node] = json.dumps({
                        'name': '',
                        'time': [],
                        'time (inc)': []
                    })
                else:
                    name = entry_func_df['name'].unique().tolist()
                    time = entry_func_df['time'].mean().tolist()
                    time_inc = entry_func_df['time (inc)'].mean().tolist()

                    ret[node] = json.dumps({
                        'name': entry_func_df['name'].unique().tolist(),
                        'time': entry_func_df['time'].mean().tolist(),
                        'time (inc)': entry_func_df['time (inc)'].mean().tolist()
                    })

            elif attr == 'imbalance_perc':
                module_df = self.df.loc[self.df['module'] == corrected_node]
                max_incTime = module_df['time (inc)'].max()
                min_incTime = module_df['time (inc)'].min()
                avg_incTime = module_df['time (inc)'].mean()

                ret[node] = (max_incTime - avg_incTime)/max_incTime

            elif attr == 'time':
                module_df = self.df.loc[self.df['module'] == corrected_node]
                if groupby == 'module':
                    group_df = self.df.groupby([groupby]).max()
                elif groupby == 'name':
                    group_df = self.df.groupby([groupby]).mean()
                ret[node] = group_df.loc[corrected_node, 'time']

            elif attr == 'vis_node_name':
                ret[node] = [node]

            elif attr == 'nid':
                ret[node] = self.df.loc[self.df['name'] == corrected_function]['nid'].tolist()

            else:
                group_df = self.df.groupby([groupby]).max()
                ret[node] = group_df.loc[corrected_node, attr]
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

    # instead of nid, get by module. nid seems very vulnerable rn.
    def run(self):
        node_df = self.df.loc[self.df['module'] == self.module]

        if 'component_path' not in self.df.columns:
            utils.debug('Error: Component path not defined in the df')

        self.add_paths(node_df, 'component_path')
        self.add_node_attributes()

        source_target_data = []
        paths = []
        for idx, node in enumerate(self.hierarchy.nodes()):
            if '/' in node:
                module = node.split('/')[0]
                func = node.split('/')[1]
                paths.append({
                    "name": func,
                    "path": [module],
                    "time (inc)": self.df.loc[self.df['name'] == func]['time (inc)'].max(),
                    "time": self.df.loc[self.df['name'] ==  func]['time'].max(),
                    # "imbalance_perc": df.loc[df['_module'] == module]['imbalance_perc'].max(),
                    "level": 1
                })
            elif '+' in node:
                module = node.split('+')[0]
                func = node.split('+')[1]
                paths.append({
                    "name": func,
                    "path": [module],
                    "time (inc)": self.df.loc[self.df['module'] == module]['time (inc)'].max(),
                    "time": self.df.loc[self.df['module'] == module]['time'].max(),
                    # "imbalance_perc": df.loc[df['_module'] == module]['imbalance_perc'].max(),
                    "level": 1
                })
            else:
                # There can be many functions with the same name but get called again and again.
                component_paths_df = self.df.loc[self.df['name'] == node]['component_path'].unique()
                component_paths_array = component_paths_df.tolist()
                print(component_paths_array)
                for idx, component_path in enumerate(component_paths_array):
                    paths.append({
                        "name": node,
                        "path": list(component_path),
                        "time (inc)": self.df.loc[self.df['name'] == node]['time (inc)'].mean(),
                        "time": self.df.loc[self.df['name'] == node]['time'].mean(),
                        # "imbalance_perc": df.loc[df['name'] == func]['imbalance_perc'].max(),
                        "level": self.df.loc[self.df['name'] == node]['component_level'].max(),
                    })

        paths_df = pd.DataFrame(paths)
        return paths_df.to_json(orient="columns")

