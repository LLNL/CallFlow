import networkx as nx
from logger import log
import math, json, utils
from ast import literal_eval as make_tuple

class DistGraph(nx.Graph):

    def __init__(self, state, path_name, add_info, group_by):
        super(DistGraph, self).__init__()
        self.state = state
        self.path_name = path_name
        self.graph = self.state.group_graph
        self.df = self.state.group_df
        self.root = utils.lookup_with_name(self.df, self.graph.roots[0].callpath[(-1)])['vis_node_name'][0]
        self.group_by = group_by
        self.callbacks = []
        self.rootRunTimeInc = self.root_runtime_inc()
        self.edge_direction = {}
        self.g = nx.DiGraph(rootRunTimeInc=(int(self.rootRunTimeInc)))
        self.add_paths(path_name)
        if add_info == True:
            print('Creating a Graph for {0}.'.format(self.state.name))
            self.add_node_attributes()
            self.add_edge_attributes()
        else:
            print('Creating a Graph without node or edge attributes.')
        self.adj_matrix = nx.adjacency_matrix(self.g)
        self.dense_adj_matrix = self.adj_matrix.todense()

    def root_runtime_inc(self):
        root = self.graph.roots[0]
        root_metrics = utils.lookup_with_name(self.df, root.callpath[(-1)])
        return root_metrics['time (inc)'].max()

    def no_cycle_path(self, path):
        ret = []
        mapper = {}
        for idx, elem in enumerate(path):
            if elem not in mapper:
                mapper[elem] = 1
                ret.append(elem)
            else:
                ret.append(elem + '_' + str(mapper[elem]))
                mapper[elem] += 1

        return tuple(ret)

    def add_paths(self, path_name):
        for idx, row in self.df.iterrows():
            if row.show_node:
                path = row[path_name]
                if isinstance(path, str):
                    path = make_tuple(row[path_name])
                corrected_path = self.no_cycle_path(path)
                self.g.add_path(corrected_path)

    def add_callback_paths(self):
        for from_module, to_modules in self.callbacks.items():
            for idx, to_module in enumerate(to_modules):
                self.g.add_edge(from_module, to_module, type='callback')

    def add_node_attributes(self):
        time_inc_mapping = self.generic_map(self.g.nodes(), 'time (inc)')
        nx.set_node_attributes((self.g), name='time (inc)', values=time_inc_mapping)
        time_mapping = self.generic_map(self.g.nodes(), 'time')
        nx.set_node_attributes((self.g), name='time', values=time_mapping)
        name_mapping = self.generic_map(self.g.nodes(), 'vis_node_name')
        nx.set_node_attributes((self.g), name='name', values=name_mapping)
        nid_mapping = self.generic_map(self.g.nodes(), 'nid')
        nx.set_node_attributes((self.g), name='nid', values=nid_mapping)
        entry_function_mapping = self.generic_map(self.g.nodes(), 'entry_functions')
        nx.set_node_attributes((self.g), name='entry_functions', values=entry_function_mapping)


    def generic_map(self, nodes, attr):
        ret = {}
        for node in nodes:
            module = node.split('=')[0]
            function = node.split('=')[1]

            if self.group_by == 'module':
                groupby = '_module'
            elif self.group_by == 'name':
                groupby = 'name'
            elif self.path_name == 'path':
                groupby = '_name'

            if attr == 'time (inc)':
                if self.group_by == 'module':
                    group_df = self.df.groupby([groupby]).max()
                elif self.group_by == 'name':
                    group_df = self.df.groupby([groupby]).max()
                ret[node] = group_df.loc[(node, 'time (inc)')]
            
            elif attr == 'entry_functions':
                module_df = self.df.loc[(self.df['module'] == module)]
                entry_func_df = module_df.loc[(module_df['component_level'] == 2)]
                if entry_func_df.empty:
                    ret[node] = json.dumps({'name':'', 
                     'time':[],  'time (inc)':[]})
                else:
                    name = entry_func_df['name'].unique().tolist()
                    time = entry_func_df['time'].mean().tolist()
                    time_inc = entry_func_df['time (inc)'].max().tolist()
                    ret[node] = json.dumps({
                        'name':entry_func_df['name'].unique().tolist(), 
                        'time':entry_func_df['time'].mean().tolist(), 
                        'time (inc)':entry_func_df['time (inc)'].max().tolist()
                    })
            
            elif attr == 'imbalance_perc':
                module_df = self.df.loc[(self.df['module'] == module)]
                max_incTime = module_df['time (inc)'].max()
                min_incTime = module_df['time (inc)'].min()
                avg_incTime = module_df['time (inc)'].mean()
                ret[node] = (max_incTime - avg_incTime) / max_incTime
            
            elif attr == 'time':
                module_df = self.df.loc[(self.df['module'] == module)]
                if self.group_by == 'module':
                    group_df = self.df.groupby([groupby]).max()
                elif self.group_by == 'name':
                    group_df = self.df.groupby([groupby]).max()
                ret[node] = group_df.loc[(node, 'time')]
            
            elif attr == 'vis_node_name':
                ret[node] = [node]

            elif attr == 'nid':
                df = self.df.loc[(self.df['vis_node_name'] == node)][attr]
                if df.empty:
                    ret[node] = int(self.df[(self.df[groupby] == node)][attr].unique()[0])
                else:
                    ret[node] = list(set(self.df[(self.df['vis_node_name'] == node)][attr].tolist()))
            
            else:
                group_df = self.df.groupby([groupby]).mean()
                ret[node] = group_df.loc[(node, attr)]

        return ret

    def tailhead(self, edge):
        return (
         edge[0], edge[1])

    def tailheadDir(self, edge):
        return (
         str(edge[0]), str(edge[1]), self.edge_direction[edge])

    def edges_from(self, node):
        for e in self.g.edges(node):
            yield e + ('forward', )

    def edge_id(self, edge):
        return edge[:-1]

    def assign_levels(self):
        levelMap = {}
        track_level = 0
        nodes = self.g.nbunch_iter(self.root)
        for start_node in nodes:
            active_nodes = [start_node]
            levelMap[self.root] = 0
            for edge in nx.edge_dfs(self.g, start_node, 'original'):
                log.warn('[Graph] Edge: {0}'.format(edge))
                head_level = None
                tail_level = None
                head, tail = self.tailhead(edge)
                if head != start_node:
                    active_nodes.append(head)
                if head in active_nodes:
                    if head != start_node:
                        if tail in active_nodes:
                            log.warn('Cycle found : {0} <====> {1}'.format(head, tail))
                            continue
                        self.edge_direction[(head, tail)] = 'forward_edge'
                        levelMap[tail] = levelMap[head] + 1
                        track_level += 1
                        log.warn('level for {0}: {1}'.format(tail, levelMap[tail]))
                    active_nodes = head == start_node and [
                     start_node]
                    track_level = 0

        return levelMap

    def flow_map(self):
        flowMap = {}
        nodes = self.g.nbunch_iter(self.root)
        for start_node in nodes:
            for edge in nx.edge_dfs(self.g, start_node, 'original'):
                head_level = None
                tail_level = None
                head, tail = self.tailhead(edge)
                if head in self.level_mapping.keys():
                    head_level = self.level_mapping[head]
                if tail in self.level_mapping.keys():
                    tail_level = self.level_mapping[tail]
                flowMap[(edge[0], edge[1])] = (int(head_level), int(tail_level))

        return flowMap

    def add_edge_attributes(self):
        capacity_mapping = self.calculate_flows(self.g)
        nx.set_edge_attributes((self.g), name='weight', values=capacity_mapping)

    def leaves_below(self, graph, node):
        return set(sum(([vv for vv in v if graph.out_degree(vv) == 0] for k, v in nx.dfs_successors(graph, node).items()), []))

    def immediate_children(self):
        ret = {}
        parentChildMap = nx.dfs_successors(self.g, self.root)
        nodes = self.g.nodes()
        for node in nodes:
            if node in parentChildMap.keys():
                ret[node] = parentChildMap[node]

        return ret

    def edge_type(self, graph):
        ret = {}
        edges = graph.edges()
        for edge in edges:
            source = edge[0]
            target = edge[1]
            if source.endswith('_') or target.endswith('_'):
                ret[edge] = 'back_edge'
            else:
                ret[edge] = 'forward_edge'

        return ret

    def number_of_runs(self):
        ret = {}
        return ret

    def calculate_flows(self, graph):
        ret = {}
        edges = graph.edges()
        additional_flow = {}
        for edge in edges:
            source = edge[0]
            target = edge[1]

        for edge in edges:
            added_flow = 0
            group_df = self.df.groupby(['_' + self.group_by]).max()
            source_inc = group_df.loc[(edge[0], 'time (inc)')]
            target_inc = group_df.loc[(edge[1], 'time (inc)')]
            if source_inc == target_inc:
                ret[edge] = source_inc
            else:
                ret[edge] = target_inc

        return ret
