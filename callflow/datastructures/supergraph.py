import networkx as nx

class SuperGraph(ht.GraphFrame):

    def __init__(self, graph=None, dataframe=None,
                       exc_metrics=None, inc_metrics=None):

        #TODO: will we ever want to create a graphframe without data?
        if graph is not None and dataframe is not None:
            super().__init__(graph, dataframe, exc_metrics, inc_metrics)

            # shortcut!
            self.df = self.dataframe

        # save a networkx graph
        self.nxg = None

    @staticmethod
    def _create_source_targets(self, path):
        module = ""
        edges = []

        for idx, callsite in enumerate(path):
            if idx == len(path) - 1:
                break

            source = sanitizeName(path[idx])
            target = sanitizeName(path[idx + 1])

            edges.append({"source": source, "target": target})
        return edges

    @staticmethod
    def _check_cycles(self, hierarchy, G):
        try:
            cycles = list(nx.find_cycle(self.hierarchy, orientation="ignore"))
        except:
            cycles = []

        return cycles

    @staticmethod
    def _remove_cycles(self, hierarchy, G, cycles):
        for cycle in cycles:
            source = cycle[0]
            target = cycle[1]
            print("Removing edge:", source, target)
            if source == target:
                print("here")
                G.remove_edge(source, target)
                G.remove_node(source)
                G.remove_node

            if cycle[2] == "reverse":
                print("Removing edge:", source, target)
                G.remove_edge(source, target)
        return G

    @staticmethod
    def _add_hierarchy_paths(self, hierarchy, df, path_name, filterTopCallsites=False):
        module_df = self.df.loc[self.df["module"] == self.module]
        if filterTopCallsites:
            group_df = module_df.groupby(["name"]).mean()
            f_group_df = group_df.loc[group_df[self.config.filter_by] > 500000]
            callsites = f_group_df.index.values.tolist()
            df = df[df["name"].isin(callsites)]

        paths = df[path_name].unique()
        for idx, path in enumerate(paths):
            if isinstance(path, float):
                return []
            path = make_tuple(path)
            source_targets = self.create_source_targets(path)
            for edge in source_targets:
                source = edge["source"]
                target = edge["target"]
                if not hierarchy.has_edge(source, target):
                    hierarchy.add_edge(source, target)


    def module_hierarchy(self, module=None):
        hierarchy = nx.DiGraph()
        node_paths_df = self.df.loc[self.df["module"] == self.module]

        if "component_path" not in self.df.columns:
            utils.debug("Error: Component path not defined in the df")

        with self.timer.phase("Add paths"):
            self._add_hierarchy_paths(hierarchy, node_paths_df, "component_path")

        cycles = self._check_cycles(hierarchy)
        while len(cycles) != 0:
            self.hierarchy = self._remove_cycles(hierarchy, cycles)
            cycles = self._check_cycles(hierarchy)
            print(f"cycles: {cycles}")

        return hierarchy


