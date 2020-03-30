import networkx as nx
from utils.logger import log
import math, json, utils
from ast import literal_eval as make_tuple
import numpy as np
from utils.timer import Timer
from ast import literal_eval as make_list
import pandas as pd

class SuperGraph(nx.Graph):
    # Attributes:
    # 1. State => Pass the state which needs to be handled.
    # 2. path => '', 'path', 'group_path' or 'component_path'
    # 3. construct_graph -> To decide if we should construct graph from path
    # 4. add_data => To
    def __init__(
        self, states, path, group_by_attr="module", construct_graph=True, add_data=False, reveal_callsites=[], reveal_modules=[]
    ):
        super(SuperGraph, self).__init__()
        self.states = states
        self.timer = Timer()

        # Store the ensemble graph (Since it is already processed.)
        self.state_entire = self.states['ensemble_entire']
        self.state_filter = self.states['ensemble_filter']
        self.state_group = self.states['ensemble_group']
        self.ensemble_g = self.state_group.g
        self.node_list = np.array(list(self.ensemble_g.nodes()))

        # Path type to group by
        # TODO: Generalize to any group the user provides.
        self.path = path
        self.group_by = group_by_attr

        self.entire_df = self.state_entire.df
        self.group_df = self.state_group.df
        # Columns to consider.
        # TODO: Generalize it either all columns or let user specify the value using config.json
        self.columns = [
            "time (inc)",
            "module",
            # "group_path",
            "name",
            "time",
            # "callers",
            # "callees",
            # "vis_name",
            "module",
            "actual_time",
            # "show_node",
        ]

        # Store all the names of runs in self.runs.
        # TODO: Change name in the df from 'dataset' to 'run'
        self.runs = self.entire_df["dataset"].unique()

        with self.timer.phase("Creating data maps"):
            self.create_ensemble_maps()
            self.create_target_maps()
        
        self.reveal_callsites = reveal_callsites

        with self.timer.phase("Construct Graph"):
            if construct_graph:
                print("Creating a Graph for {0}.".format(self.state_group.name))
                self.mapper = {}
                self.g = nx.DiGraph()
                self.add_paths(path)
                # self.add_reveal_paths()
            else:   
                print("Using the existing graph from state {0}".format(self.state.name))

        # Variables to control the data properties globally.
        self.callbacks = []
        self.edge_direction = {}

        add_data = True 
        with self.timer.phase("Add graph attributes"):
            if add_data == True:
                self.add_node_attributes()
                self.add_edge_attributes()
            else:
                print("Creating a Graph without node or edge attributes.")
        print(self.timer)

    def create_target_maps(self):
        self.target_df = {}
        self.target_modules = {}
        self.target_module_group_df = {}
        self.target_module_name_group_df = {}
        self.target_module_callsite_map = {}
        self.target_module_time_inc_map = {}
        self.target_module_time_exc_map = {}
        self.target_name_time_inc_map = {}
        self.target_name_time_exc_map = {}

        for run in self.runs:
            # Reduce the entire_df to respective target dfs. 
            self.target_df[run] = self.entire_df.loc[self.entire_df['dataset'] == run]
            
            # Unique modules in the target run
            self.target_modules[run] = self.target_df[run]['module'].unique()

            # Group the dataframe in two ways.
            # 1. by module
            # 2. by module and callsite
            self.target_module_group_df[run] = self.target_df[run].groupby(['module'])
            self.target_module_name_group_df[run] = self.target_df[run].groupby(['module', 'name'])

            # Module map for target run {'module': [Array of callsites]}
            self.target_module_callsite_map[run] = self.target_module_group_df[run]['name'].unique().to_dict()

            # Inclusive time maps for the module level and callsite level. 
            self.target_module_time_inc_map[run] = self.target_module_group_df[run]['time (inc)'].max().to_dict()
            self.target_name_time_inc_map[run] = self.target_module_name_group_df[run]['time (inc)'].max().to_dict()

            # Exclusive time maps for the module level and callsite level. 
            self.target_module_time_exc_map[run] = self.target_module_group_df[run]['time'].max().to_dict()
            self.target_name_time_exc_map[run] = self.target_module_name_group_df[run]['time'].max().to_dict()

    def create_ensemble_maps(self):
        self.modules = self.entire_df['module'].unique()

        self.module_name_group_df = self.entire_df.groupby(['module', 'name'])
        self.module_group_df = self.entire_df.groupby(['module'])

        # Module map for ensemble {'module': [Array of callsites]}
        self.module_callsite_map = self.module_group_df['name'].unique().to_dict()

        # Inclusive time maps for the module level and callsite level. 
        self.module_time_inc_map = self.module_group_df['time (inc)'].max().to_dict()
        self.name_time_inc_map = self.module_name_group_df['time (inc)'].max().to_dict()

        # Exclusive time maps for the module level and callsite level.
        self.module_time_exc_map = self.module_group_df['time'].max().to_dict()
        self.name_time_exc_map = self.module_name_group_df['time'].max().to_dict()

    def rename_cycle_path(self, path):
        ret = []
        moduleMapper = {}
        dataMap = {}

        if(isinstance(path, float)):
            return []
        path = make_tuple(path)
        for idx, elem in enumerate(path):
            callsite = elem.split('=')[1]
            module = elem.split('=')[0]
            if (module not in dataMap):
                moduleMapper[module] = 0
                dataMap[module] =  [{
                    'callsite': callsite,
                    'module': module,
                    'level': idx
                }]
            else:
                flag = [p['level'] == idx for p in dataMap[module]]
                if np.any(np.array(flag)):
                    moduleMapper[module] += 1
                    dataMap[module].append({
                    'callsite': callsite,
                    'module': module,
                    'level': idx
                    })
                else:
                    dataMap[module].append({
                        'callsite': callsite,
                        'module': module,
                        'level': idx
                    })
            ret.append(dataMap[module][-1])

        return ret

    def add_reveal_paths(self):
        paths = []
        for callsite in self.reveal_callsites:
            df = self.entire_df.loc[self.entire_df['name'] == callsite]
            paths.append(df['group_path'].unique()[0])

        reveal_paths = np.array(paths)

        for reveal_path_str in reveal_paths:
            reveal_path_list = self.rename_cycle_path(reveal_path_str)
            callsite_idx = len(reveal_path_list) - 2
            source = reveal_path_list[callsite_idx]
            target = reveal_path_list[callsite_idx + 1]

            if(not self.g.has_edge(target['module'], target['module'] + '=' + target_name)):
                source_module = source['module']
                target_module = target['module']

                source_name = self.reveal_callsites[0]
                target_name = target['callsite']

                print(f"Adding edge: {source_name}, {target_name}")
                self.g.add_edge(target_module, target_module + '=' + target_name, attr_dict={
                    "source_callsite": source_name,
                    "target_callsite": target_name
                })

    def add_paths_backup(self, path):
        paths = self.group_df[path].unique()

        for idx, path_str in enumerate(paths):
            path_list = self.rename_cycle_path(path_str)

            for callsite_idx, callsite in enumerate(path_list):
                if callsite_idx != len(path_list) - 1:
                    source = path_list[callsite_idx]
                    target = path_list[callsite_idx + 1]

                    print(source['module'], target['module'], source['callsite'], target['callsite'])

                    if(not self.g.has_edge(source['module'], target['module'])):
                        source_module = source['module']
                        target_module = target['module']

                        source_name = source['callsite']
                        target_name = target['callsite']

                        # if(self.name_time_map[target_name] != 0):
                        if(self.g.has_edge(target['module'], source['module'])):
                            edge_type = 'callback'
                        else:
                            edge_type = 'normal'

                        if(edge_type == 'normal'):
                            self.g.add_edge(source_module, target_module,   attr_dict={
                                "source_callsite": source_name,
                                "target_callsite": target_name,
                                "edge_type": edge_type
                            })

        # reveal_paths = self.add_reveal_paths()
        # for reveal_path_str in reveal_paths:
        #     reveal_path_list = self.rename_cycle_path(reveal_path_str)
        #     print(reveal_path_list)
        #     callsite_idx = len(reveal_path_list) - 2
        #     source = reveal_path_list[callsite_idx]
        #     target = reveal_path_list[callsite_idx + 1]

        #     if(not self.g.has_edge(target['module'], target['module'] + '=' + target_name)):
        #         source_module = source['module']
        #         target_module = target['module']

        #         source_name = self.reveal_callsites[0]
        #         target_name = target['callsite']

        #         print(f"Adding edge: {source_name}, {target_name}")
        #         self.g.add_edge(target_module, target_module + '=' + target_name, attr_dict={
        #             "source_callsite": source_name,
        #             "target_callsite": target_name
        #         })
            
    def add_paths(self, path):
        print(self.group_df[['dataset', 'name', 'module', 'group_path']])
        paths = self.group_df[path].unique()

        for idx, path_str in enumerate(paths):
            path_list = self.rename_cycle_path(path_str)

            for callsite_idx, callsite in enumerate(path_list):
                if callsite_idx != len(path_list) - 1:
                    source = path_list[callsite_idx]
                    target = path_list[callsite_idx + 1]

                    print(source['module'], target['module'], source['callsite'], target['callsite'])

                    source_module = source['module']
                    target_module = target['module']

                    source_name = source['callsite']
                    target_name = target['callsite']

                    if(self.g.has_edge(target['module'], source['module'])):
                        edge_type = 'callback'
                    else:
                        edge_type = 'normal'

                    if(edge_type == 'normal'):
                        self.g.add_edge(source_module, target_module,   attr_dict={
                            "source_callsite": source_name,
                            "target_callsite": target_name,
                            "edge_type": edge_type
                        })

    def add_node_attributes(self):
        ensemble_mapping = self.ensemble_map(self.g.nodes())

        for idx, key in enumerate(ensemble_mapping):
            nx.set_node_attributes(self.g, name=key, values=ensemble_mapping[key])

        dataset_mapping = {}
        for run in self.runs:
            dataset_mapping[run] = self.dataset_map(self.g.nodes(), run)

            nx.set_node_attributes(
                self.g, name=run, values=dataset_mapping[run]
            )

    def add_edge_attributes(self):
        # number_of_runs_mapping = self.number_of_runs()
        # nx.set_edge_attributes(self.g, name="number_of_runs", values=number_of_runs_mapping)
        capacity_mapping = self.calculate_flows(self.g)
        nx.set_edge_attributes(self.g, name="weight", values=capacity_mapping)
        exc_capacity_mapping = self.calculate_exc_weight(self.g)
        nx.set_edge_attributes(self.g, name="exc_weight", values=exc_capacity_mapping)

    def number_of_runs(self):
        ret = {}
        for idx, run in enumerate(self.runs):
            for edge in self.states[run].g.edges():
                source = edge[0]
                target = edge[1]
                source_module = self.df.loc[self.df['name'] == source]['module'].unique()[0]
                target_module = self.df.loc[self.df['name'] == target]['module'].unique()[0]

                edge_with_module = (source_module + '=' + source, target_module + '=' + target)
                if edge_with_module not in ret:
                    ret[edge_with_module] = 0
                ret[edge_with_module] += 1
        return ret

    def tailhead(self, edge):
        return (edge[0], edge[1])

    def tailheadDir(self, edge):
        return (str(edge[0]), str(edge[1]), self.edge_direction[edge])

    def leaves_below(self, graph, node):
        return set(
            sum(
                (
                    [vv for vv in v if graph.out_degree(vv) == 0]
                    for k, v in nx.dfs_successors(graph, node).items()
                ),
                [],
            )
        )

    def callsite_time(self, group_df, module, callsite):
        callsite_df = group_df.get_group((module, callsite))
        max_inc_time = callsite_df['time (inc)'].max()
        max_exc_time = callsite_df['time'].max()

        return {
            'Inclusive': max_inc_time,
            'Exclusive': max_exc_time
        } 

    # is expensive....
    def module_time(self, group_df=pd.DataFrame([]), module_callsite_map={}, module=''):
        exc_time_sum = 0
        inc_time_max = 0
        for callsite in module_callsite_map[module]:
            callsite_df = group_df.get_group((module, callsite))
            max_inc_time = callsite_df['time (inc)'].max()
            inc_time_max = max(inc_time_max, max_inc_time)
            max_exc_time = callsite_df['time'].max()
            exc_time_sum += max_exc_time
        return {
            'Inclusive': inc_time_max,
            'Exclusive': exc_time_sum
        }

    def calculate_flows(self, graph):
        ret = {}
        additional_flow = {}
        for edge in graph.edges(data=True):
            if('=' in edge[0]):
                source_module = edge[0].split('=')[0]
            else:
                source_module = edge[0]

            if('=' in edge[1]):
                target_module = edge[1].split('=')[0]
            else:
                target_module = edge[1]

            source_callsite = edge[2]['attr_dict']['source_callsite']
            target_callsite = edge[2]['attr_dict']['target_callsite']

            print(f' Source: {source_module} => {source_callsite}')
            print(f' Target: {target_module} => {target_callsite}')

            source_inc = self.module_time_inc_map[source_module]
            target_inc = self.module_time_inc_map[target_module]

            source_module_inc = self.module_time_inc_map[source_module]
            target_module_inc = self.module_time_inc_map[source_module]

            source_callsite_inc = self.name_time_inc_map[(source_module, source_callsite)]
            target_callsite_inc = self.name_time_inc_map[(target_module, target_callsite)]
            
            source_callsite_exc = self.name_time_exc_map[(source_module, source_callsite)]
            target_callsite_exc = self.name_time_exc_map[(target_module, target_callsite)]

            source_neighbors =  [n for n in graph.neighbors(edge[0])]
            target_neighbors = [n for n in graph.neighbors(edge[1])]

            source_outdegree = graph.out_degree(edge[0])
            target_indegree = graph.in_degree(edge[1])

            print(source_outdegree, target_indegree)

            # Come back here. 
            # if(source_outdegree > 2 ):
            #     ret[(edge[0], edge[1])] = target_module_inc
            # else:
            #     ret[(edge[0], edge[1])] = target_callsite_inc

            ret[(edge[0], edge[1])] = target_callsite_inc

            # For Lulesh. 

            # if(target_callsite_exc == 0):
            #     edge_weight = target_inc

            # ret[(edge[0], edge[1])] = target_inc

        return ret


    def calculate_exc_weight(self, graph):
        ret = {}
        additional_flow = {}
        for edge in graph.edges(data=True):
            if('=' in edge[0]):
                source_module = edge[0].split('=')[0]
            else:
                source_module = edge[0]

            if('=' in edge[1]):
                target_module = edge[1].split('=')[0]
            else:
                target_module = edge[1]

            source_callsite = edge[2]['attr_dict']['source_callsite']
            target_callsite = edge[2]['attr_dict']['target_callsite']

            source_exc = self.name_time_exc_map[(source_module, source_callsite)]
            target_exc = self.name_time_exc_map[(target_module, target_callsite)]

            ret[(edge[0], edge[1])] = target_exc

        return ret

    def ensemble_map(self, nodes):
        ret = {}

        ensemble_columns = []
        for column in self.columns:
            ensemble_columns.append(column)

        new_columns = ["max_inc_time", "max_exc_time", "dist_inc_time", "dist_exc_time"]
        ensemble_columns.append("dist_inc_time")
        ensemble_columns.append("dist_exc_time")

        # loop through the nodes
        for node in self.g.nodes():
            if '=' in node:
                module = node.split('=')[0]
                callsite = node.split('=')[1]
            else:
                module = node
                callsite = self.module_callsite_map[module].tolist()

            for column in ensemble_columns:
                if column not in ret:
                    ret[column] = {}

                if (column == "time (inc)"):
                    ret[column][node] = self.module_time_inc_map[module]
                    
                elif( column == 'time'):
                    ret[column][node] = self.module_time_exc_map[module]

                elif( column == 'actual_time'):
                    ret[column][node] = self.module_time(group_df=self.module_name_group_df, module_callsite_map=self.module_callsite_map, module=module)

                elif ( column == "module"):
                    ret[column][node] = module

                elif (column == 'name'):
                    ret[column][node] = callsite
        return ret

    def dataset_map(self, nodes, run):
        ret = {}
        
        for node in self.g.nodes():
            if( node in self.target_module_callsite_map[run].keys()):
                if '=' in node:
                    module = node.split("=")[0]
                    callsite = node.split('=')[1]
                else:
                    module = node
                    callsite = self.target_module_callsite_map[run][module].tolist()

                if node not in ret:
                    ret[node] = {}

                for column in self.columns:
                    if (column == "time (inc)"):
                        ret[node][column] = self.target_module_time_inc_map[run][module]

                    elif (column == "time"):
                        ret[node][column] = self.target_module_time_exc_map[run][module]

                    elif (column == "module"):
                        ret[node][column] = module

                    elif column == "actual_time":
                        ret[node][column] = self.module_time(group_df=self.target_module_name_group_df[run], module_callsite_map=self.target_module_callsite_map[run], module=module)

                    elif (column == 'name'):
                        ret[node][column] = callsite

        return ret