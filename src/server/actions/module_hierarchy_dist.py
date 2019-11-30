import pandas as pd
import time
import networkx as nx
import utils
from logger import log
from ast import literal_eval as make_tuple

class moduleHierarchyDist:
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

    def run_graph(self):
        self.hierarchy = nx.bfs_tree(self.graph, self.modFunc, depth_limit=5)

    def add_paths(self, df, path_name):
        for idx, row in df.iterrows():
            path = row[path_name]
            if isinstance(path, str):
                path = make_tuple(row[path_name])
            self.hierarchy.add_path(path)

    def generic_map(self, nodes, attr):
        ret = {}
        log.info("Number of nodes in this hierarchy: {0}".format(len(nodes)))
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

            ret['time (inc)'] = {}
            ret['time'] = {}
            ret['component_path'] = {}

            # if attr == 'time (inc)':
            group_max_df = self.df.groupby([groupby]).max()
            group_mean_df = self.df.groupby([groupby]).mean()
            ret['time (inc)'][node] = group_max_df.loc[corrected_node, 'time (inc)']

            if groupby == 'module':
                group_df = group_max_df
            elif groupby == 'name':
                group_df = group_mean_df
            ret['time'][node] = group_df.loc[corrected_node, 'time']

            ret[attr][node] = group_max_df.loc[corrected_node, attr]
        return ret

    def add_node_attributes(self):
        # time_mapping = self.generic_map(self.hierarchy.nodes(), 'time (inc)')
        mapper = self.generic_map(self.hierarchy.nodes(), 'time (inc)')

        nx.set_node_attributes(self.hierarchy, name='time (inc)', values=mapper['time (inc)'])
        nx.set_node_attributes(self.hierarchy, name='time', values=mapper['time'])
        # nx.set_node_attributes(self.hierarchy, name='imbalance_perc', values=mapper['imbalance_perc'])
        nx.set_node_attributes(self.hierarchy, name='component_path', values=mapper['component_path'])

    # instead of nid, get by module. nid seems very vulnerable rn.
    def run(self):
        node_df = self.df.loc[self.df['module'] == self.module]
        node_df = node_df.loc[node_df['component_level'] < 5]
        if 'component_path' not in self.df.columns:
            utils.debug('Error: Component path not defined in the df')

        self.add_paths(node_df, 'component_path')
        self.add_node_attributes()

        paths = []
        for idx, node in enumerate(self.hierarchy.nodes()):
            if '=' in node:
                split = node.split('=')
                module = split[0]
                func = split[1]
                path = make_tuple(self.df.loc[self.df['name'] == func]['component_path'].unique()[0])
                paths.append({
                    "name": func,
                    "path": path,
                    "time (inc)": self.df.loc[self.df['module'] == module]['time (inc)'].max(),
                    "time": self.df.loc[self.df['module'] == module]['time'].max(),
                    # "imbalance_perc": df.loc[df['_module'] == module]['imbalance_perc'].max(),
                    "level": int(self.df.loc[self.df['name'] == func]['component_level'].unique()[0]) - 1
                })
            else:
                func = node
                path = make_tuple(self.df.loc[self.df['name'] == func]['component_path'].unique()[0])
                paths.append({
                    "name": func,
                    "path": path,
                    "time (inc)": self.df.loc[self.df['name'] == func]['time (inc)'].max(),
                    "time": self.df.loc[self.df['name'] == func]['time'].max(),
                    # "imbalance_perc": df.loc[df['_module'] == module]['imbalance_perc'].max(),
                    "level": int(self.df.loc[self.df['name'] == func]['component_level'].unique()[0]) - 1
                })

        paths_df = pd.DataFrame(paths)
        return paths_df.to_json(orient="columns")

