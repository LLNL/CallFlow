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

from callflow import get_logger
from callflow.modules import Histogram
from callflow.utils.sanitizer import Sanitizer
from callflow.utils.utils import NumpyEncoder
from callflow.utils.df import *
from .metrics import FILE_FORMATS, METRIC_PROXIES, TIME_COLUMNS

LOGGER = get_logger(__name__)


# ------------------------------------------------------------------------------
class SuperGraph(ht.GraphFrame):
    """
    SuperGraph data structure
    """
    _FILENAMES = {
        "df": "cf-df.pkl",
        "nxg": "cf-nxg.json",
        "env_params": "env_params.txt",
        "aux": "aux-{}.npz",
    }

    # --------------------------------------------------------------------------
    def __init__(self, name):
        """
        Constructor to SuperGraph
        :param name: SuperGraph's tag name
        """
        assert isinstance(name, str)

        self.roots = [] # Roots of the call graph
        self.mean_root_inctime = 0.0 # Mean inc. metric of the root nodes

        self.dataframe = None
        self.nxg = None
        self.graph = None

        self.name = name  # dataset name
        # self.timestamp = timestamp # dataset timestamp
        self.profile_format = ""

        self.parameters = {}
        self.proxy_columns = {}
        self.callers = {}
        self.callees = {}
        self.paths = {}
        self.hatchet_nodes = {}

        self.callsites = {}
        self.modules = {}
        self.modules_list = []
        self.inv_callsites = {}
        self.inv_modules = {}
        self.callsite_module_map = {}
        self.module_callsite_map = {}

        self.profiler = Profiler()

    # --------------------------------------------------------------------------
    def __str__(self):
        """SuperGraph string representation"""
        return f"SuperGraph<{self.name}; df = {self.dataframe.shape}>"

    def __repr__(self):
        """SuperGraph string representation"""
        return self.__str__()

    def get_name(self, idx, ntype):
        """
        Getter to get the node's name based on type.

        :param idx (int): node index
        :param ntype (str): node type (e.g., module, callsite)
        :return name (str)
        """
        if ntype == 'callsite':
            return self.callsites.get(idx, None)
        if ntype == 'module':
            return self.modules.get(idx, None)
        assert 0

    def get_idx(self, name, ntype):
        """
        Getter to get the node's index based on type.

        :param name (str): node name
        :param ntype (str): node type (e.g., module, callsite)
        :return idx (int)
        """
        if ntype == 'callsite':
            return self.inv_callsites.get(name, None)
        if ntype == 'module':
            return self.inv_modules.get(name, None)
        assert 0

    def get_module(self, callsite_idx):
        """
        Get module name from the node name.

        :param callsite_idx (int): callsite index
        :return (str): module for a call site
        """
        assert isinstance(callsite_idx, int)
        return self.callsite_module_map[callsite_idx]
        
    def get_runtime(self, node_idx, ntype, metric, apply_func=None):
        """
        Getter to obtain the runtime as per the node type.

        :param node_idx (int): node index
        :param ntype (str): node type (e.g., 'callsite' or 'module')
        :param metric (str): metric (e.g., 'time' or 'time (inc)')
        :param apply_func (func): apply function (e.g., mean, min, max)
        :return (float): runtime of a node
        """
        if ntype == 'callsite':
            return self.df_lookup_by_column("name", node_idx)[metric].apply(apply_func)
        elif ntype == 'module':
            return self.df_lookup_by_column("module", node_idx)[metric].apply(apply_func)

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
        self.add_callsites_and_modules_maps(module_callsite_map)
        self.add_time_proxies()

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
        

        if True:
            self.dataframe = SuperGraph.read_df(path)

        if True:
            self.nxg = SuperGraph.read_nxg(path)

        if read_graph:
            self.graph = SuperGraph.read_graph(path)

        if read_parameter:
            self.parameters = SuperGraph.read_env_params(path)

        # ----------------------------------------------------------------------
        self.add_time_proxies()
        self.df_reset_index() # TODO: This might be cause a possible side
        # effect. Beware!!
        self.roots = self.nxg_get_roots(self.nxg)
        self.add_callsites_and_modules_maps()
        
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
        if 'module' in self.dataframe.columns and self.dataframe['module'].dtype != "int64":
            LOGGER.debug('Extracting the module map from the dataframe')

            # create a map of module-indexes
            self.dataframe['module'], self.modules = \
                self.dataframe['module'].factorize(sort=True)

            self.modules = {i: Sanitizer.sanitize(v) for i, v in enumerate(self.modules)}
        
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

        self.modules_list = np.array(list(self.inv_modules.keys()))
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

    # --------------------------------------------------------------------------
    # SuperGraph API functions
    # These functions are used by the endpoints. 
    # --------------------------------------------------------------------------
    def summary(self):

        cols = list(self.dataframe.columns)
        result = {"name": self.name,
                  "meantime": self.df_root_max_mean_runtime(self.roots, "time (inc)"),
                  "roots": self.roots,
                  "ncallsites": self.df_count("name"),
                  "modules": self.modules_list,
                  "m2c": self.module_callsite_map,
                  "c2m": self.callsite_module_map,
                  "nmodules": self.df_count("module"), # if "module" in cols else 0,
                  "nranks": self.df_count("rank") if "rank" in cols else 1,
                  "nedges": len(self.nxg.edges())}

        for p in TIME_COLUMNS:
            result[p] = self.df_minmax(p)

        return result

    def timeline(self, nodes, ntype, metric):
        grp_df = self.df_group_by(ntype)
        return { node : df_apply_func(grp_df.get_group(self.get_idx(node, ntype)), metric, self.proxy_columns) for node in nodes}    

    def histogram(self, node, ntype, metric, nbins):
        if ntype == "callsite":
            df = df_bi_level_group(self.dataframe, "name", None, cols=self.time_columns, group_by=["rank"], apply_func=lambda _: _.mean())
        elif ntype == "module":
            df = df_bi_level_group(self.dataframe, "module", "name", cols=self.time_columns, group_by=["rank"], apply_func=lambda _: _.mean())        

        result = Histogram(df, relative_to_df=None,
                                histo_types="rank",
                                proxy_columns=self.proxy_columns).result

    # --------------------------------------------------------------------------
    # SuperGraph.df functions
    # --------------------------------------------------------------------------
    def df_reset_index(self):
        """
        Wrapper to reset the index. The columns are added inplace and are not
        dropped. 
        """
        self.dataframe.reset_index(drop=False, inplace=True)

    def df_columns(self):
        """
        Wrapper to get all column names from a dataframe.
        :return: (list) columns of dataframe
        """
        return self.dataframe.columns

    def df_get_proxy(self, column):
        """
        Wrapper to get column name based on proxy.

        :param column: (str) column name
        :return: (str) proxy of the column name
        """
        return self.proxy_columns.get(column, column)

    def df_get_column(self, column, index="name"):
        """
        Wrapper to get a provided column based on an index. 

        :param column: (str) column name
        :param index: (str) column name to index by
        :return:
        """
        column = self.df_get_proxy(column)
        return self.dataframe.set_index(index)[column]

    def df_add_column(self, column_name,
                      apply_value=None, apply_func=None,
                      apply_dict=None, dict_default=None,
                      apply_on="name", update=False):
        """
        Wrapper to add a column to a dataframe in place. 

        :param column_name: (str) Name of the column to add in the dataframe
        :param apply_value: (*) Value to apply on the column
        :param apply_func: (func) Function to apply on the column
        :param apply_dict: (dict) Dict to apply on the column
        :param apply_on: (str) Column to apply the func, value or dict on
        :param dict_default: (dict) default dictionary to apply on
        :param update: (bool) in place update or not
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

    def df_unique(self, column):
        """
        Wrapper to get unique rows from a column.

        :param column: (str) column name
        :return: (ndarray) numpy array containing the unique elements. 
        """
        column = self.df_get_proxy(column)
        return self.dataframe[column].unique()

    def df_count(self, column):
        """
        Wrapper to get the count of unique row elements of a column. 

        :param column: (str) Column name
        :return: (int) Count of unique elements in the column.
        """
        return len(self.df_unique(column))

    def df_minmax(self, column):
        """
        Wrapper to get the min and max elements from a column. 

        :param column: (str) column name
        :return: (float, float) min, max of the column 
        """
        column = self.df_get_proxy(column)
        return self.dataframe[column].min(), self.dataframe[column].max()

    def df_filter_by_value(self, column, value):
        """
        Wrapper to filter a column by a threshold value. 

        :param column: (str) Column name
        :param value: (float or int) threshold value to filter by
        :return: (pandas.dataframe) filtered dataframe
        """
        assert isinstance(value, (int, float))
        column = self.df_get_proxy(column)
        df = self.dataframe.loc[self.dataframe[column] > value]
        return df[df["name"].isin(df["name"].unique())]

    def df_filter_by_name(self, values):
        """
        Wrapper to filter a dataframe by a list of names on the "name" column.

        :param names: (list) list of values to filter
        :return: (pandas.dataframe) Filtered dataframe
        """
        assert isinstance(values, list)
        return self.dataframe[self.dataframe["name"].isin(values)]

    def df_filter_by_search_string(self, column, search_strings):
        """
        Wrapper to filter by a list of search strings. 
        Uses numpy for fast operation.

        :param column: (str) Column name
        :param search_strings: (list) search strings to filter by.
        :return: (pandas.dataframe) Filtered dataframe
        """
        unq, ids = np.unique(self.dataframe[column], return_inverse=True)
        unq_ids = np.searchsorted(unq, search_strings)
        mask = np.isin(ids, unq_ids)
        return self.dataframe[mask]

    def df_lookup_with_column(self, column, value):
        """
        Wrapper to look up by a value on a column

        :param column: (str) Column name
        :param value: (int, or float) Value to lookup by
        :return: (pandas.dataframe) Lookup dataframe
        """
        assert isinstance(value, (int, float, str))

        column = self.df_get_proxy(column)
        return self.dataframe.loc[self.dataframe[column] == value]

    def df_group_by(self, columns):
        """
        Wrapper to group the dataframe by columns. 

        :param columns: columns to groupby
        :return: grouped dataframe
        """
        if isinstance(columns, list):
            return self.dataframe.groupby(columns)
        else:
            assert isinstance(columns, str)
            return self.dataframe.groupby([columns])

    def df_get_top_by_attr(self, column, count, sort_attr):
        """
        Get top n values of a column sorted in descending fashion by another column ("sort_attr")

        :param column: (str) column to groupby (e.g., name, module)
        :param count: (int) number of rows to return (e.g., n = 10 would return top-10
        values)
        :param sort_attr: (str) sorting attribute (e.g., time or time (inc))
        :return: (list) top-n values 
        """
        assert isinstance(count, int) and isinstance(sort_attr, str)
        assert count > 0

        df = self.dataframe.groupby([column]).mean()
        df = df.sort_values(by=[sort_attr], ascending=False)
        df = df.nlargest(count, sort_attr)
        return df.index.values.tolist()

    def df_factorize_column(self, column):
        """
        Wrapper to factorize a column. 
        
        :param column: (name)
        :param sanitize:
        :return:
        """
        column = self.df_get_proxy(column)
        _fct = self.dataframe[column].factorize()
        self.dataframe[column] = _fct[0]
        return _fct[1].values.tolist()

    def df_xs_group_column(self, name, column, groups=[], apply_func=None):
        """
        Wrapper to get a cross-secton of a dataframe.

        :param name: (str) 
        :param column: (str) column name
        :param groups: (str) column to group by.
        :param apply_func: (func) Apply a function after the group operation
        :return: (pandas.dataframe) Cross-sectioned dataframe.
        """
        if len(groups) > 0:
            _df = self.df_group_by(groups) 
        else:
            _df = self.dataframe

        if apply_func is not None:
            _df = _df.apply(apply_func)

        return _df.xs(name, level=column)

    def df_root_max_mean_runtime(self, roots, column):
        mean_runtime = 0.0
        column = self.df_get_proxy(column)
        for root in roots:
            mean_runtime = max(mean_runtime, self.df_lookup_with_column("name", root)[column].mean())
        return round(mean_runtime, 2)

    # --------------------------------------------------------------------------
    # SuperGraph.graph utilities.
    # --------------------------------------------------------------------------
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

    def nxg_get_roots(self, nxg):
        roots = []
        for component in nx.weakly_connected_components(nxg):
            G_sub = nxg.subgraph(component)
            roots.extend([n for n,d in G_sub.in_degree() if d==0])
        return roots

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
        fdm = os.path.join(path, 'ht-metrics.npz')

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
    def todelete_write_aux(path, data, name):
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
    def todelete_read_aux(path, name):
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
    # Supergraph.nxg methods
    # --------------------------------------------------------------------------
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
