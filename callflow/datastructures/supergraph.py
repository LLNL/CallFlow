# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
"""
CallFlow's data structure to construct Super Graphs.
"""
import os
import json
import numpy as np
import pandas as pd
import hatchet as ht
import networkx as nx
from ast import literal_eval as make_list

try:
    from pyinstrument import Profiler
except Exception:
    #print('Did not find pytinstrument')
    class Profiler:
        def __init__(self):
            pass
        def start(self):
            pass
        def stop(self):
            pass

import callflow
from callflow import get_logger
from callflow.utils.sanitizer import Sanitizer
from callflow.utils.utils import NumpyEncoder
from callflow.utils.df import *
from .metrics import FILE_FORMATS, METRIC_PROXIES, TIME_COLUMNS
from callflow.modules import UnpackAuxiliary

LOGGER = get_logger(__name__)


# ------------------------------------------------------------------------------
class SuperGraph(ht.GraphFrame):
    """
    SuperGraph data structure
    """
    _FILENAMES = {
        "ht": "hatchet_tree.txt",
        "df": "df.pkl",
        "nxg": "nxg.json",
        "env_params": "env_params.txt",
        "aux": "aux-{}.npz",
    }

    # --------------------------------------------------------------------------
    def __init__(self, name):
        """
        Constructor to SuperGraph
        :param name: SuperGraph's tag.
        """
        assert isinstance(name, str)

        self.roots = [] # Roots of the call graph
        self.mean_root_inctime = 0.0 # Mean inc. metric of the root nodes
        self.callsites = [] # all callsites in the call graph
        self.f_callsites = [] # filtered callsites (after QueryMatcher))

        self.nxg = None

        self.name = name  # dataset name
        self.profile_format = ""

        self.parameters = {}
        self.aux_data = {}
        self.proxy_columns = {}
        self.callers = {}
        self.callees = {}
        self.paths = {}
        self.hatchet_nodes = {}
        ## should not use this since we can re-extract this instantly
        ## keeping indexes stored runs the risk of using stale information
        #self.indexes = []

        self.callsites = {}
        self.modules = {}
        self.inv_callsites = {}
        self.inv_modules = {}
        self.callsite_module_map = {}
        self.module_callsite_map = {}

        self.gf = None
        self.profiler = Profiler()

    # --------------------------------------------------------------------------
    def __str__(self):
        """SuperGraph string representation"""
        return f"SuperGraph<{self.name}; df = {self.dataframe.shape}>"

    def __repr__(self):
        """SuperGraph string representation"""
        return self.__str__()

    def get_name(self, idx, ntype):
        if ntype == 'callsite':
            return self.callsites.get(idx, None)
        if ntype == 'module':
            return self.modules.get(idx, None)
        assert 0

    def get_idx(self, name, ntype):
        if ntype == 'callsite':
            return self.inv_callsites.get(name, None)
        if ntype == 'module':
            return self.inv_modules.get(name, None)
        assert 0

    # --------------------------------------------------------------------------
    def create(self, path, profile_format, module_callsite_map: dict = {},  filter_by="time (inc)", filter_perc=10.0) -> None: 
        """
        Create SuperGraph from basic information. It does the following:
            1. Using the config object, it constructs the Hatchet GraphFrame.
            2. Creates a NetworkX graph from the Hatchet GraphFrame.Graph.
            3. Add time proxies.
            4. Attempts to construct module callsite mapping, if information exists.
            5. Resets the indexes of the dataframe,
            6. Sanitizes the call site names and paths.

        :param path: Path to data
        :param profile_format: Format of data
        :param module_callsite_map: Module callsite mapping
        :return:
        """
        self.profiler.start()
        self.profile_format = profile_format
        LOGGER.info(f"Creating SuperGraph ({self.name}) from ({path}) "
                    f"using ({self.profile_format}) format")

        # Create the hatchet.GraphFrame based on the profile format.
        gf = SuperGraph.from_config(path, self.profile_format)
        assert isinstance(gf, ht.GraphFrame)
        assert gf.graph is not None
        LOGGER.info(f'Loaded Hatchet GraphFrame: {df_info(gf.dataframe)}')
        LOGGER.profile('')
        if 0:
            SuperGraph.write_ht(gf, path)

        # Create a hatchet.GraphFrame using the calculated graph and graphframe.
        super().__init__(gf.graph, gf.dataframe, gf.exc_metrics, gf.inc_metrics) # Initialize here so that we dont drop index levels.

        # ----------------------------------------------------------------------
        # Process the dataframe
        if False: ## TODO: move this to the filter class!
            # Find the mean runtime of all the roots.
            self.mean_root_inctime = self.df_mean_runtime(gf.dataframe, self.roots, "time (inc)")

            # Formulate the hatchet query.
            query = [
                ("*", {f"{self.df_get_proxy(filter_by)}": f"> {filter_perc * 0.01 * self.mean_root_inctime}"})
            ]
            LOGGER.info(f"Filtering GraphFrame by Hatchet Query :{query}")

            LOGGER.info(f"Number of callsites before QueryMatcher: {len(self.callsites)}")
            self.f_callsites = SuperGraph.hatchet_filter_callsites_by_query(gf, query)
            LOGGER.info(f"Number of callsites in after QueryMatcher: {len(self.f_callsites)}")

            LOGGER.profile(f'-----> Finished with hatchet filter: {_df_info(self.dataframe)}')

        # ----------------------------------------------------------------------
        self.add_callsites_and_modules_maps(module_callsite_map)
        self.add_time_proxies()
        #self.df_add_nid_column()

        # ----------------------------------------------------------------------
        # Hatchet requires node and rank to be indexes.
        # remove the indexes to maintain consistency.
        # We will remove node since it gets droped when `gf.drop_index_levels()`
        #self.indexes = list(self.dataframe.index.names)
        #LOGGER.debug(f'Dataframe indexes = {self.indexes}')
        #self.df_reset_index()

        # ----------------------------------------------------------------------
        # TODO: For faster searches, bring this back.
        # self.indexes.insert(0, 'dataset')
        # self.dataframe.set_index(self.indexes, inplace=True, drop=True)

        LOGGER.info(f'Processed dataframe: {df_info(self.dataframe)}')
        LOGGER.profile('')
        self.profiler.stop()

        # ----------------------------------------------------------------------
        # Find the roots of the super graph. Used to get the mean inclusive runtime.
        self.roots = SuperGraph.hatchet_get_roots(gf.graph)  # Contains all unfiltered roots as well.
        self.nxg = self.hatchet_graph_to_nxg(self.graph)
        LOGGER.debug(f'Found {len(self.roots)} graph roots; and converted to nxg')

        _csidx = lambda _: self.get_idx(_, 'callsite')
        for node in self.graph.traverse():
            node_name = Sanitizer.from_htframe(node.frame)
            node_idx = _csidx(node_name)
            self.hatchet_nodes[node_idx] = node
            self.paths[node_idx] = [_csidx(Sanitizer.from_htframe(_)) for _ in node.paths()[0]]
            self.callers[node_idx] = [_csidx(_.frame.get('name')) for _ in node.parents]
            self.callees[node_idx] = [_csidx(_.frame.get('name')) for _ in node.children]

        LOGGER.info(f'Processed graph')
        LOGGER.profile('')

        self.df_add_column("callees", apply_dict=self.callees, dict_default=[])
        self.df_add_column("callers", apply_dict=self.callers, dict_default=[])
        #self.df_add_column("path", apply_dict=self.paths, dict_default=[])

    # --------------------------------------------------------------------------
    def load(
        self, path, read_graph=False, read_parameter=False, read_aux=False
    ) -> None:
        """
        Load the SuperGraph class from reading .callflow data.

        :param path: (str) Path to .callflow directory.
        :param read_graph: (bool) Read the graph, default is False.
        :param read_parameter: (bool) Read parameters, default is False.
        :param read_aux: (bool) Read auxiliary data, default is True.
        :return:
        """
        LOGGER.info(f"Reading SuperGraph ({self.name}) from ({path})")
        self.dataframe = None
        self.nxg = None
        self.graph = None

        if True:
            self.dataframe = SuperGraph.read_df(path)

        if True:
            self.nxg = SuperGraph.read_nxg(path)

        if read_graph:
            self.graph = SuperGraph.read_graph(path)

        if read_parameter:
            self.parameters = SuperGraph.read_env_params(path)

        if read_aux:
            self.aux_data = UnpackAuxiliary(path, self.name).result
        # ----------------------------------------------------------------------
        self.add_time_proxies()
        # self.df_reset_index() # TODO: This might be cause a possible side
        # effect. Beware!!
        self.roots = self.get_roots(self.nxg)
        self.modules = np.array(self.df_factorize_column("module", sanitize=False))

    # --------------------------------------------------------------------------
    def add_callsites_and_modules_maps(self, module_callsite_map={}):

        has_modules_in_df = "module" in self.dataframe.columns
        has_modules_in_map = len(module_callsite_map) > 0
        assert not (has_modules_in_df and has_modules_in_map)

        # ----------------------------------------------------------------------
        LOGGER.info('Creating \"module-callsite\" and \"callsite-module\" maps')

        # create a map of callsite-indexes
        self.callsites = df_as_dict(self.dataframe, 'nid', 'name')

        # ----------------------------------------------------------------------
        # if the dataframe already has columns
        if 'module' in self.dataframe.columns:
            LOGGER.debug('Extracting the module map from the dataframe')

            # create a map of module-indexes
            self.dataframe['module'], self.modules = \
                self.dataframe['module'].factorize(sort=True)

            #self.modules = {i: v for i, v in enumerate(self.modules)}
            self.modules = {i: Sanitizer.sanitize(v) for i,v in enumerate(self.modules)}
            #for k,v in self.modules.items():
            #    print(f'[{k}] --> ({v})')

            self.callsite_module_map = df_as_dict(self.dataframe, 'nid', 'module')
            self.module_callsite_map = {m: [] for m,c in self.modules.items()}
            self.module_callsite_map[-1] = []
            for ccode, mcode in self.callsite_module_map.items():
                self.module_callsite_map[mcode].append(ccode)

        # ----------------------------------------------------------------------
        elif has_modules_in_map:
            LOGGER.debug('Using the supplied module map')
            # need to change the datastructures for this case
            assert 0
            self.modules = module_callsite_map.keys()
            self.module_callsite_map = module_callsite_map
            self.callsite_module_map = {_: [] for _ in self.callsites}

            for mcode, mname in enumerate(self.modules):
                clist = self.module_callsite_map[mname]
                for c in clist:
                    self.callsite_module_map[c].append(mcode)

            self.df_add_column("module",
                               apply_dict=self.callsite_module_map,
                               apply_on="name")

        # ----------------------------------------------------------------------
        else:
            LOGGER.debug('No module map found. Defaulting to \"module=callsite\"')
            self.modules = self.callsites
            self.callsite_module_map = {c: c for c,m in self.callsites.items()}
            self.module_callsite_map = {m: [m] for m,c in self.modules.items()}
            self.df_add_column('module', apply_func=lambda _: _, apply_on='name')

        # ----------------------------------------------------------------------
        self.inv_callsites = {v: i for i,v in self.callsites.items()}
        self.inv_modules = {v: i for i, v in self.modules.items()}
        assert all([isinstance(m,int) for c,m in self.callsite_module_map.items()])
        assert all([isinstance(c,list) for m,c in self.module_callsite_map.items()])

        LOGGER.info(f'Created (\"module-to-callsite\" = {len(self.module_callsite_map)}) '
                    f'and (\"callsite-to-module\" = {len(self.callsite_module_map)}) '
                    'maps')

    # --------------------------------------------------------------------------
    def add_time_proxies(self):
        """

        :return:
        """
        ## TODO: we should use ht.gf.exc_metric and ht.gf.inc_metric for this
        for key, proxies in METRIC_PROXIES.items():
            if key in self.dataframe.columns:
                continue
            for _ in proxies:
                if _ in self.dataframe.columns:
                    self.proxy_columns[key] = _
                    break
            assert key in self.proxy_columns.keys()

        if len(self.proxy_columns) > 0:
            LOGGER.info(f"created column proxies: {self.proxy_columns}")

    # --------------------------------------------------------------------------
    def write(
        self, path, write_df=True, write_graph=False, write_nxg=True, write_aux=True
    ):
        """
        Write the SuperGraph (refer _FILENAMES for file name mapping).

        :param path: path to write the files. (.callflow directory)
        :param write_df: (bool) write dataframe
        :param write_graph: (bool) write graph
        :param write_nxg: (bool) write networkX graph
        :param write_aux: (bool) write auxiliary data
        :return:
        """
        if not write_df and not write_graph and not write_nxg:
            return

        LOGGER.info(f"Writing SuperGraph to ({path})")
        if write_df:
            SuperGraph.write_df(path, self.dataframe)

        if write_graph:
            SuperGraph.write_graph(path, super().tree(color=False))

        if write_nxg:
            SuperGraph.write_nxg(path, self.nxg)

        if write_aux:
            #if self.name in list(self.auxiliary_data.keys()):
            if self.name == 'ensemble':
                for k, v in self.aux_data.items():
                    SuperGraph.write_aux(path, v, k)
            else:
                SuperGraph.write_aux(path, self.aux_data, self.name)

    # --------------------------------------------------------------------------
    # SuperGraph.dataframe api
    # --------------------------------------------------------------------------
    def summary(self):

        cols = list(self.dataframe.columns)
        result = {"meantime": self.df_mean_runtime(self.dataframe, self.roots, "time (inc)"),
                  "roots": self.roots,
                  "ncallsites": self.df_count("name"),
                  "nmodules": self.df_count("module"), # if "module" in cols else 0,
                  "nranks": self.df_count("rank") if "rank" in cols else 1,
                  "nedges": len(self.nxg.edges())}

        for p in TIME_COLUMNS:
            result[p] = self.df_minmax(p)

        return result

    # --------------------------------------------------------------------------
    # added these functions to support auxiliary
    # we need this
    '''
    def df_mod_callsite_maps(self):

        # let's reduce the size for faster processing
        df = self.dataframe[['module', 'name']]
        modules = df_unique(df, "module")
        callsites = df_unique(df, "name")
        df.set_index('module', inplace=True)

        m2c = {}
        c2m = {_: [] for _ in callsites}
        for m in modules:
            clist = df.xs(m)['name'].unique()
            m2c[m] = clist
            for c in clist:
                c2m[c].append(m)

        return m2c, c2m
    '''
    def to_delete_df_mod2callsite(self, modules = None):

        if None in self.indexes:
            LOGGER.error('Found None in indexes. Removing!')
            self.indexes = [_ for _ in self.indexes if _ is not None]

        if modules is None:
            modules = self.df_unique("module")
        else:
            assert isinstance(modules, (list, np.ndarray))

        # TODO: this is a hack for now to append a "rank" index.
        if len(self.indexes) == 0 and "rank" in self.dataframe.columns:
            self.indexes = ["rank"]
        _indexes = ["module"] + self.indexes
        _df = self.dataframe.set_index(_indexes)

        if "rank" in self.indexes:
            return {_: _df.xs(_, 0)["name"].unique()
                    for _ in modules}
        else:
            return {_: _df.xs(_, 0)["name"] for _ in modules}

    def to_delete_df_callsite2mod(self, callsites = None):

        if callsites is None:
            callsites = self.df_unique("name")
        else:
            assert isinstance(callsites, (list, np.ndarray))

        # TODO: this is a hack for now to append a "rank" index. 
        if len(self.indexes) == 0 and "rank" in self.dataframe.columns:
            self.indexes = ["rank"]
        _indexes = ["name"] + self.indexes
        _df = self.dataframe.set_index(_indexes)

        map = {}
        for _ in callsites:
            if "rank" in self.indexes:
                __df =  _df.xs(_, 0)
                mod_idx = __df["module"].unique()
                # assert mod_idx.shape[0] in [0, 1]
                if mod_idx.shape[0] == 1:
                    map[_] = mod_idx[0]
        return map

    # --------------------------------------------------------------------------
    # (Not documented)
    # TODO: CAL-65: Move to utils directory
    def df_reset_index(self):
        """

        :return:
        """
        self.dataframe.reset_index(drop=False, inplace=True)

    def df_columns(self):
        """

        :return:
        """
        return self.dataframe.columns

    def df_get_proxy(self, column):
        """

        :param column:
        :return:
        """
        return self.proxy_columns.get(column, column)

    def df_get_column(self, column, index="name"):
        """

        :param column:
        :param index:
        :return:
        """
        column = self.df_get_proxy(column)
        return self.dataframe.set_index(index)[column]

    def df_add_column(self, column_name,
                      apply_value=None, apply_func=None,
                      apply_dict=None, dict_default=None,
                      apply_on="name", update=False):
        """

        :param column_name:
        :param apply_value:
        :param apply_func:
        :param apply_on:
        :param apply_dict:
        :param dict_default:
        :param update:
        :return:
        """
        has_value = apply_value is not None
        has_func = apply_func is not None
        has_dict = apply_dict is not None
        assert 1 == int(has_value) + int(has_func) + int(has_dict)

        if column_name in self.dataframe.columns and not update:
            return

        if has_value:
            assert isinstance(apply_value, (int, float, str))
            LOGGER.debug(f'appending column "{column_name}" = "{apply_value}"')
            self.dataframe[column_name] = apply_value

        if has_func:
            assert callable(apply_func) and isinstance(apply_on, str)
            LOGGER.debug(f'appending column "{column_name}" = {apply_func}')
            self.dataframe[column_name] = self.dataframe[apply_on].apply(apply_func)

        if has_dict:
            assert isinstance(apply_dict, dict) and isinstance(apply_on, str)
            LOGGER.debug(f'appending column "{column_name}" = (dict); default=({dict_default})')
            self.dataframe[column_name] = self.dataframe[apply_on].apply(lambda _: apply_dict.get(_, dict_default))

    # TODO: merge this with the function above
    def df_add_nid_column(self):
        """

        :return:
        """
        if "nid" in self.dataframe.columns:
            return
        LOGGER.debug('Adding nid column')
        self.dataframe["nid"] = self.dataframe.groupby("name")["name"].transform(
            lambda x: pd.factorize(x)[0]
        )

    '''
    def df_update_mapping(self, col_name, mapping, apply_on="name"):
        """

        :param col_name:
        :param mapping:
        :param apply_on:
        :return:
        """
        self.dataframe[col_name] = self.dataframe[apply_on].apply(
            lambda _: mapping[_] if _ in mapping.keys() else ""
        )
    '''
    def df_unique(self, column):
        """

        :param column:
        :return:
        """
        column = self.df_get_proxy(column)
        return self.dataframe[column].unique()

    def df_count(self, column):
        """

        :param column:
        :return:
        """
        return len(self.df_unique(column))

    def df_minmax(self, column):
        """

        :param column:
        :return:
        """
        column = self.df_get_proxy(column)
        return self.dataframe[column].min(), self.dataframe[column].max()

    def df_filter_by_value(self, column, value):
        """

        :param column:
        :param value:
        :return:
        """
        assert isinstance(value, (int, float))
        column = self.df_get_proxy(column)
        df = self.dataframe.loc[self.dataframe[column] > value]
        return df[df["name"].isin(df["name"].unique())]

    def df_filter_by_name(self, names):
        """

        :param names:
        :return:
        """
        assert isinstance(names, list)
        return self.dataframe[self.dataframe["name"].isin(names)]

    def df_filter_by_search_string(self, column, search_strings):
        """

        :param column:
        :param search_strings:
        :return:
        """
        unq, ids = np.unique(self.dataframe[column], return_inverse=True)
        unq_ids = np.searchsorted(unq, search_strings)
        mask = np.isin(ids, unq_ids)
        return self.dataframe[mask]

    def df_lookup_with_column(self, column, value):
        """

        :param column:
        :param value:
        :return:
        """
        column = self.df_get_proxy(column)
        return self.dataframe.loc[self.dataframe[column] == value]

    def df_group_by(self, columns):
        """

        :param columns:
        :return:
        """
        if isinstance(columns, list):
            return self.dataframe.groupby(columns)
        else:
            assert isinstance(columns, str)
            return self.dataframe.groupby([columns])

    def df_get_top_by_attr(self, count, sort_attr):
        """

        :param count:
        :param sort_attr:
        :return:
        """
        assert isinstance(count, int) and isinstance(sort_attr, str)
        assert count > 0

        df = self.dataframe.groupby(["name"]).mean()
        df = df.sort_values(by=[sort_attr], ascending=False)
        df = df.nlargest(count, sort_attr)
        return df.index.values.tolist()

    def todelete_df_factorize_column(self, column, sanitize=False):
        """

        :param column:
        :param sanitize:
        :return:
        """
        LOGGER.debug(f'Factorizing dataframe on column {column}')
        column = self.df_get_proxy(column)
        # Sanitize column name.
        if sanitize:
            self.dataframe[column] = self.dataframe[column].apply(
                lambda _: Sanitizer.sanitize(_)
            )
        _fct = self.dataframe[column].factorize()
        self.dataframe[column] = _fct[0]
        return _fct[1].values.tolist()

    def df_xs_group_column(self, df, groups, name, column, apply_func):
        """

        :param df:
        :param groups:
        :param name:
        :param column:
        :param apply_func:
        :return:
        """
        # module_df = df.groupby(groups).mean()
        module_df = df.groupby(groups).apply(apply_func)
        return module_df.xs(name, level=column)

    # --------------------------------------------------------------------------
    # SuperGraph.graph utilities.
    # --------------------------------------------------------------------------
    # TODO: CAL-65: Move to utils directory
    @staticmethod
    def hatchet_graph_to_nxg(ht_graph):
        """
        Constructs a networkX graph from hatchet graph.

        :param ht_graph:
        :return:
        """
        assert isinstance(ht_graph, ht.graph.Graph)

        nxg = nx.DiGraph()
        for root in ht_graph.roots:
            node_gen = root.traverse()
            node = root

            try:
                while node:

                    # Get all node paths from hatchet.
                    node_paths = node.paths()

                    # Loop through all the node paths.
                    for node_path in node_paths:
                        if len(node_path) >= 2:
                            src_name = Sanitizer.from_htframe(node_path[-2])
                            trg_name = Sanitizer.from_htframe(node_path[-1])
                            nxg.add_edge(src_name, trg_name)
                    node = next(node_gen)

            except StopIteration:
                pass
            finally:
                del root

        return nxg

    @staticmethod
    def hatchet_get_roots(graph):
        return [root.frame.get('name') for root in graph.roots]

    @staticmethod
    def hatchet_filter_callsites_by_query(gf, query):
        """
        Returns the filtered callsites based on the query.
        """
        # Expensive. We need to do this to speed up the filtering process. 
        gf.drop_index_levels() 

        # Filter the graphframe using hatchet (initial filtering) using QueryMatcher.
        fgf = gf.filter(query)

        return df_unique(fgf.dataframe, "name")

    def df_mean_runtime(self, df, roots, column):
        mean_runtime = 0.0
        column = self.df_get_proxy(column)
        for root in roots:
            mean_runtime = max(mean_runtime, df.loc[df['name'] == root][column].mean())
        return round(mean_runtime, 2)

    def get_roots(self, nxg):
        roots = []
        for component in nx.weakly_connected_components(nxg):
            G_sub = nxg.subgraph(component)
            roots.extend([n for n,d in G_sub.in_degree() if d==0])
        return roots

    def get_module_idx(self, module):
        """
        Get module index of a given module.
        :param module:
        :return:
        """
        # TODO: CAL-53
        # If it is not in the module_fct_list, it means its a node with a cycle.
        # This might be the correct way to go, but lets place a quick fix by
        # comparing the strings...
        # if module not in self.modules:
        #     self.modules.append(module)
        #     return len(self.modules)

        if "=" in module:
            module = module.split("=")[0]

        return list(self.modules).index(module)

    # --------------------------------------------------------------------------
    # Create GraphFrame methods
    # --------------------------------------------------------------------------
    @staticmethod
    def from_config(data_path, profile_format):
        """
        Create a GraphFrame directly from the data_path and profile_format.

        :param data_path: path to data
        :param profile_format: Profile format
        :return gf: GraphFrame
        """
        if profile_format not in FILE_FORMATS:
            raise ValueError(f"Invalid profile format: {profile_format}")

        gf = SuperGraph.read_ht(data_path)
        if gf is not None:
            return gf

        if profile_format == "hpctoolkit":
            gf = ht.GraphFrame.from_hpctoolkit(data_path)

        elif profile_format == "caliper":
            grouping_attribute = "function"
            default_metric = "sum(sum#time.duration), inclusive_sum(sum#time.duration)"
            query = "select function,%s group by %s format json-split" % (
                default_metric,
                grouping_attribute,
            )
            gf = ht.GraphFrame.from_caliper(data_path, query=query)

        elif profile_format == "caliper_json":
            gf = ht.GraphFrame.from_caliper_json(data_path)

        elif profile_format == "gprof":
            gf = ht.GraphFrame.from_gprof_dot(data_path)

        elif profile_format == "literal":
            gf = ht.GraphFrame.from_literal(data_path)

        elif profile_format == "lists":
            gf = ht.GraphFrame.from_lists(data_path)

        assert gf is not None
        return gf

    # --------------------------------------------------------------------------
    # static read/write functionality
    # --------------------------------------------------------------------------
    @staticmethod
    def write_ht(gf, path='.'):

        import pickle
        assert isinstance(gf, ht.GraphFrame)

        LOGGER.debug(f"Writing Hatchet GraphFrame to ({path})")
        fdf = os.path.join(path, 'ht-df.pkl')
        fdg = os.path.join(path, 'ht-graph.pkl')
        fdm = os.path.join(path, 'ht--metrics.npz')

        gf.dataframe.to_pickle(fdf)
        with open(fdg, "wb") as fptr:
            pickle.dump(gf.graph, fptr)
        np.savez_compressed(fdm, exc=gf.exc_metrics, inc=gf.inc_metrics)

    @staticmethod
    def read_ht(path):

        import pickle
        fdf = os.path.join(path, 'ht-df.pkl')
        fdg = os.path.join(path, 'ht-graph.pkl')
        fdm = os.path.join(path, 'ht-metrics.npz')

        if not os.path.exists(fdf) or not os.path.exists(fdg) or not os.path.exists(fdm):
            return None

        LOGGER.debug(f"Reading Hatchet GraphFrame from ({path})")
        df = pd.read_pickle(fdf)
        with open(fdg, "rb") as fptr:
            graph = pickle.load(fptr)
        met = np.load(fdm)
        ext_metrics, int_metrics = list(met['exc'][()]), list(met['inc'][()])
        return ht.GraphFrame(graph, df, ext_metrics, int_metrics)

    # --------------------------------------------------------------------------
    # TODO: CAL-66: Clean up unnecessary writing and reading functions.
    @staticmethod
    def write_df(path, df):
        """

        :param path:
        :param df:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["df"])
        LOGGER.debug(f"Writing ({fname})")

        ext = os.path.splitext(SuperGraph._FILENAMES["df"])[-1]
        if '.csv' == ext:
            df.to_csv(fname)
        elif '.pkl' == ext:
            df.to_pickle(fname)

    @staticmethod
    def write_nxg(path, nxg):
        """

        :param path:
        :param nxg:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["nxg"])
        LOGGER.debug(f"Writing ({fname})")
        nxg_json = nx.readwrite.json_graph.node_link_data(nxg)
        with open(fname, "w") as fptr:
            json.dump(nxg_json, fptr, indent=2)

    @staticmethod
    def write_graph(path, graph_str):
        """

        :param path:
        :param graph_str:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["ht"])
        LOGGER.debug(f"Writing ({fname})")
        with open(fname, "w") as fptr:
            fptr.write(graph_str)

    @staticmethod
    def write_aux(path, data, name):
        """

        :param path:
        :param data:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["aux"].format(name))
        LOGGER.debug(f"Writing ({fname})")

        ext = os.path.splitext(SuperGraph._FILENAMES["aux"])[-1]
        if '.json' == ext:
            with open(fname, "w") as f:
                json.dump(data, f, cls=NumpyEncoder)
        elif '.npz' == ext:
            np.savez_compressed(fname, **data)
        else:
            assert False

    @staticmethod
    def read_df(path):
        """

        :param path:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["df"])
        LOGGER.debug(f"Reading ({fname})")

        df = None
        ext = os.path.splitext(SuperGraph._FILENAMES["df"])[-1]
        if '.csv' == ext:
            df = pd.read_csv(fname)
        elif '.pkl' == ext:
            df = pd.read_pickle(fname)

        if df is None or df.empty:
            raise ValueError(f"Did not find a valid dataframe in ({fname}).")
        return df

    @staticmethod
    def read_nxg(path):
        """

        :param path:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["nxg"])
        LOGGER.debug(f"Reading ({fname})")
        with open(fname, "r") as nxg_file:
            graph = json.load(nxg_file)
            nxg = nx.readwrite.json_graph.node_link_graph(graph)
        if nxg is None:
            raise ValueError(f"Did not find a valid nxg in ({fname}).")
        return nxg

    @staticmethod
    def read_graph(path):
        """

        :param path:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["ht"])
        LOGGER.debug(f"Reading ({fname})")
        with open(fname, "r") as graph_file:
            graph = json.load(graph_file)
        if not isinstance(graph, ht.GraphFrame.Graph):
            raise ValueError(f"Did not find a valid graph in ({fname}).")
        return graph

    @staticmethod
    def read_aux(path, name):
        """

        :param path:
        :return:
        """
        fname = os.path.join(path, SuperGraph._FILENAMES["aux"].format(name))
        LOGGER.debug(f"Reading ({fname})")

        data = {}
        ext = os.path.splitext(SuperGraph._FILENAMES["aux"])[-1]
        try:
            if '.json' == ext:
                with open(fname, "r") as fptr:
                    data = json.load(fptr)
            elif '.npz' == ext:
                data = np.load(fname, allow_pickle=True)

        except Exception as e:
            LOGGER.critical(f"Failed to read aux file: {e}")
        return data

    @staticmethod
    def read_env_params(path):
        """

        :param path:
        :return:
        """
        data = {}
        try:
            fname = os.path.join(path, SuperGraph._FILENAMES["params"])
            LOGGER.debug(f"Reading ({fname})")
            for line in open(fname, "r"):
                for num in line.strip().split(","):
                    split_num = num.split("=")
                    data[split_num[0]] = split_num[1]
        except Exception as e:
            LOGGER.critical(f"Failed to read env_params file: {e}")
        return data

    # --------------------------------------------------------------------------
    # functionality related to modules
    # --------------------------------------------------------------------------
    def get_module(self, callsite):
        """
        If such a mapping exists, this function returns the module based on
        mapping. Else, it queries the graphframe for a module name.

        :param callsite (str): call site
        :return (str): module for a call site
        """
        return self.module_map[callsite]

    def filter_sg(self, filter_by, filter_val) -> None:
        """
        In-place filtering on the NetworkX Graph.

        :param filter_by: filter by value at "time" and "time (inc)".
        :param filter_val: filter threshold
        :return: None
        """
        LOGGER.debug(f'Filtering {self.__str__()}: "{filter_by}" <= {filter_val}')
        self.dataframe = self.df_filter_by_value(filter_by, filter_val)

        callsites = self.dataframe["name"].unique()
        nxg = nx.DiGraph()

        if filter_by == "time (inc)":
            for edge in self.nxg.edges():
                # If source is present in the callsites list
                if edge[0] in callsites and edge[1] in callsites:
                    nxg.add_edge(edge[0], edge[1])
                else:
                    LOGGER.debug(f"Removing the edge: {edge}")

        elif filter_by == "time":
            for callsite in callsites:
                path = self.df_lookup_with_column("name", callsite)["path"].tolist()[0]
                path = make_list(path)
                nxg.add_path(path)

        self.nxg = nxg

    def filter_by_datasets(self, selected_runs):
        """
        Filter by the selected runs
        :param selected_runs: Array of dataset tag names.
        :return: runs
        """
        # TODO: This code is repeated in modules/auxiliary.py.
        # Move to a instance method of SuperGraph.
        if selected_runs is not None:
            runs = selected_runs
            self.dataframe = self.df_filter_by_search_string("dataset", runs)

        else:
            runs = [self.name]
            self.dataframe = self.dataframe

        return runs    
    # --------------------------------------------------------------------------
