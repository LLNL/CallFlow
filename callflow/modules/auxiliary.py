# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's module to consolidate the auxiliary information
(i.e., histograms, gradients, and boxplots)
for each call site or module based on the type of data requested.
"""
import numpy as np
import pandas as pd
from scipy.stats import kurtosis, skew

import callflow
from callflow.utils.utils import print_dict_recursive
from callflow.utils.df import df_minmax, df_count, df_unique, df_group_by, \
    df_fetch_columns, df_lookup_by_column, df_lookup_and_list

from .gradients import Gradients
from .boxplot import BoxPlot
from .histogram import Histogram
from callflow.datastructures.metrics import TIME_COLUMNS

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
class Auxiliary:
    """
    Auxiliary: consolidates per-callsite and per-module information.
    """
    def __init__(self, sg, selected_runs=None,
                 nbins_rank: int = 20, nbins_run: int = 20):
        """
        Constructor
        :param sg: SuperGraph
        :param selected_runs: Array of selected runs
        :param nbins_rank: Bin count for MPI-level histogram
        :param nbins_run: Bin count for run-level histogram
        """
        assert isinstance(sg, (callflow.SuperGraph, callflow.EnsembleGraph))

        self.nbins_rank = nbins_rank
        self.nbins_run = nbins_run

        self.proxy_columns = sg.proxy_columns
        self.time_columns = [self.proxy_columns.get(_, _) for _ in TIME_COLUMNS]

        self.runs = sg.filter_by_datasets(selected_runs)

        LOGGER.warning(f"Computing auxiliary data for ({sg}) with "
                       f"{len(self.runs)} runs: {self.runs}")

        self.result = {}
        # ----------------------------------------------------------------------
        # single super graph
        if not isinstance(sg, callflow.EnsembleGraph):

            df_module = df_group_by(sg.dataframe, "module")
            df_name = df_group_by(sg.dataframe, "name")

            self.result = {"summary": sg.summary(),
                           "modules": sg.modules,
                           "m2c": sg.df_mod2callsite(),
                           "c2m": sg.df_callsite2mod(),
                           "data_mod": self.new_collect_data(sg.name, "module", df_module),
                           "data_cs": self.new_collect_data(sg.name, "name", df_name)
                           }

        # ----------------------------------------------------------------------
        # ensemble graph
        else:
            edf_module = df_group_by(sg.dataframe, "module")
            edf_name = df_group_by(sg.dataframe, "name")

            self.result['ensemble'] = {"summary": sg.summary(),
                                       "modules": sg.modules,
                                       "m2c": sg.df_mod2callsite(),
                                       "c2m": sg.df_callsite2mod(),
                                       "data_mod": self.new_collect_data(sg.name, "module", edf_module),
                                       "data_cs": self.new_collect_data(sg.name, "name", edf_name)
                                       }

            # for relative computation
            for dataset in self.runs:
                df = df_lookup_by_column(sg.dataframe, "dataset", dataset)
                df_module = df_group_by(df, "module")
                df_name = df_group_by(df, "name")

                # TODO: this assumes that the original dataframe was modified
                self.result[dataset] = {"summary": sg.supergraphs[dataset].summary(),
                                        "modules": sg.supergraphs[dataset].modules,
                                        "m2c": sg.supergraphs[dataset].df_mod2callsite(),
                                        "c2m": sg.supergraphs[dataset].df_callsite2mod(),
                                        "data_mod": self.new_collect_data(dataset, "module", df_module, edf_module),
                                        "data_cs": self.new_collect_data(dataset, "name", df_name, edf_name)
                                        }

        # ----------------------------------------------------------------------
        '''
        # ----------------------------------------------------------------------
        if isinstance(sg, callflow.EnsembleGraph):
            callsites = df_unique(sg.dataframe, "name")
            modules = df_unique(sg.dataframe, "module")

            dataframes = {"ensemble": sg.dataframe}
            dataframes_name_group = {"ensemble": df_group_by(sg.dataframe, "name")}
            dataframes_module_group = {"ensemble": df_group_by(sg.dataframe, "module")}

            for dataset in self.runs:
                dataframes[dataset] = df_lookup_by_column(
                    sg.dataframe, "dataset", dataset
                )
                dataframes_name_group[dataset] = df_group_by(
                    dataframes[dataset], "name"
                )
                dataframes_module_group[dataset] = df_group_by(
                    dataframes[dataset], "module"
                )

        # ----------------------------------------------------------------------
        else:
            #sg.auxiliary_data = {}
            #return
            df = sg.dataframe
            #df = df_lookup_by_column(sg.dataframe, "dataset", sg.name)
            callsites = df_unique(df, "name")
            modules = df_unique(df, "module")
            dataframes = {sg.name: df}
            dataframes_name_group = {sg.name: df_group_by(df, "name")}
            dataframes_module_group = {sg.name: df_group_by(df, "module")}

        # ----------------------------------------------------------------------
        self.result = {
            "dataset": self._collect_data_dataset(dataframes, sg),
            "moduleFctList": sg.modules,
            "callsiteModuleMap": self._callsite_module_map(dataframes, callsites),
            "moduleCallsiteMap": self._module_callsite_map(dataframes, modules),
            "runtimeProps": self._runtime_props(dataframes),
            "module": self._collect_data(dataframes_module_group, "module"),
            "callsite": self._collect_data(dataframes_name_group, "callsite"),
        }
        '''

        #print_dict_recursive(self.result)
        #exit ()

        # TODO: this should not happen this way
        sg.auxiliary_data = self.result

        # --------------------------------------------------------------------------

    # --------------------------------------------------------------------------

    def new_collect_data(self, name, grp_column, grp_df, grp_edf=None):

        assert grp_column in ['module', 'name']
        assert isinstance(grp_df, pd.core.groupby.generic.DataFrameGroupBy)
        if grp_edf is not None:
            assert isinstance(grp_edf, pd.core.groupby.generic.DataFrameGroupBy)

        is_callsite = grp_column == "name"
        is_ensemble = name == "ensemble"
        is_relative = grp_edf is not None

        assert not is_ensemble or not is_relative

        histogram, boxplot, gradients = None, None, None
        ensemble_df = None

        histo_types = []
        if not is_relative and not is_ensemble:
            histo_types = ['rank']

        result = {}
        for grp_name, df in grp_df:

            if is_relative:
                ensemble_df = grp_edf.get_group(grp_name)

            histogram = Histogram(df, relative_to_df=ensemble_df,
                                  histo_types=histo_types,
                                  proxy_columns=self.proxy_columns).result

            # todo: boxplot should also be for target wrt ensemble
            boxplot = BoxPlot(df, proxy_columns=self.proxy_columns).result

            if is_ensemble:
                gradients = Gradients(df, bins=self.nbins_run,
                                      callsiteOrModule=name,
                                      proxy_columns=self.proxy_columns).result

            # ------------------------------------------------------------------
            result[grp_name] = self.pack_json(df=df,
                                              name=grp_name,
                                              grp_type=grp_column,
                                              is_ensemble=is_ensemble,
                                              is_callsite=is_callsite,
                                              gradients=gradients,
                                              histograms=histogram,
                                              boxplots=boxplot)

        return result

    '''
    # --------------------------------------------------------------------------
    def _runtime_props(self, dataframes):
        """
        Adds runtime information, e.g., max, min inclusive and exclusive runtime.

        :param dataframes:
        :return:
        """
        props = {_: {} for _ in TIME_COLUMNS + ['rank']}

        for _p in list(props.keys()):
            if _p == 'rank':
                _enranks = 0
                for idx, tag in enumerate(dataframes):
                    _pnranks = df_count(dataframes[tag], _p, self.proxy_columns)
                    _enranks = max(_enranks, _pnranks)
                    props[_p][tag] = _pnranks

                props[_p]['ensemble'] = _enranks

            else:
                _erange = (100000, -100000)
                for idx, tag in enumerate(dataframes):
                    _prange = df_minmax(dataframes[tag], _p, self.proxy_columns)
                    _erange = (min(_erange[0], _prange[0]), max(_erange[1], _prange[1]))
                    props[_p][tag] = _prange

                props[_p]['ensemble'] = _erange

        return props

    def _collect_data_dataset(self, dataframes, sg):
        """

        :param dataframes:
        :param sg:
        :return:
        """
        #_COLUMNS_OF_INTEREST = ["node", "rank", "time", "time (inc)",
        #                        "dataset", "module", "name", "component_level"]

        _json = {}
        for k, df in dataframes.items():
            cols = list(df.columns)
            #_df = df_fetch_columns(df, _COLUMNS_OF_INTEREST, self.proxy_columns)
            #_num_modules = len(sg.modules) if "module" in _df.columns else 0
            _json[k] = {
                "ncsts": df_count(df, "name"),
                "nmods": df_count(df, "module") if "module" in cols else 0,
                "nrnks": df_count(df, "rank") if "rank" in cols else 1,
                "rtime": df_minmax(df, "time (inc)", self.proxy_columns)[1],
                "nedgs": len(sg.nxg.edges()),
            }

        return _json

    # --------------------------------------------------------------------------
    def _collect_data(self, dataframes_group, grp_type="callsite"):
        """

        :param dataframes_group:
        :param grp_type:
        :return:
        """

        is_callsite = grp_type == "callsite"
        result = {}

        # for each supergraph
        for dataset, df_group in dataframes_group.items():

            is_ensemble = dataset == "ensemble"
            result[dataset] = {}

            # for each name in the group
            for name, name_df in df_group:

                histogram, gradients, boxplot = None, None, None

                # --------------------------------------------------------------
                if is_ensemble:
                    histogram = Histogram({'ensemble': name_df},
                                          histo_types=[],           # compute all
                                          proxy_columns=self.proxy_columns).result

                    gradients = Gradients(name_df,
                                          proxy_columns=self.proxy_columns,
                                          bins=self.nbins_run,
                                          callsiteOrModule=name).result

                elif "ensemble" in dataframes_group:
                    assert not name_df.empty

                    ensemble_df = dataframes_group["ensemble"].get_group(name)
                    histogram = Histogram({'ensemble': ensemble_df,
                                           'target': name_df},
                                          histo_types=[],
                                          proxy_columns=self.proxy_columns).result

                else:
                    histogram = Histogram({dataset: name_df}, histo_types=['rank'],
                                          proxy_columns=self.proxy_columns).result

                # --------------------------------------------------------------
                # if grp_type == 'callsite':
                boxplot = BoxPlot(name_df, proxy_columns=self.proxy_columns).result

                # --------------------------------------------------------------
                result[dataset][name] = self.pack_json(
                    name=name,
                    df=name_df,
                    is_ensemble=is_ensemble,
                    is_callsite=is_callsite,
                    gradients=gradients,
                    histograms=histogram,
                    boxplots=boxplot,
                    grp_type=grp_type,
                )

        return result

    # TODO: Figure out where this should belong.
    def _callsite_module_map(self, dataframes, callsites):
        """

        :param dataframes:
        :param callsites:
        :return:
        """

        map = {}
        for _name, _df in dataframes.items():
            map[_name] = {}
            for _ in callsites:
                mod_idx = df_lookup_and_list(_df, "name", _, "module")
                assert mod_idx.shape[0] in [0, 1]
                if mod_idx.shape[0] == 1:
                    map[_name][_] = mod_idx[0]
                '' '
                else:
                    print(_name, _, mod_idx, _df.shape)
                    print(_df[["name", "module"]])
                '' '

        '' '
        map = {_name: {_: df_lookup_and_list(_df, "name", _, "module")
                       for _ in callsites}
               for _name, _df in dataframes.items()}

        for k,v in map.items():
            for _k,_v in v.items():
                if _v.shape[0] > 1:
                    LOGGER.error(f'callsite2modulemap should have lists of 1: '
                                 f'found [{k}: ({_k}: {_v})]')
        '' '
        return map

    def _module_callsite_map(self, dataframes, modules):
        """

        :param dataframes:
        :param modules:
        :return:
        """
        return {_name: {int(_): df_lookup_and_list(_df, "module", _, "name")
                        for _ in modules}
                for _name, _df in dataframes.items()}
    '''
    # --------------------------------------------------------------------------
    def pack_json(self, name, df, is_ensemble, is_callsite,
                  gradients=None, histograms=None, boxplots=None,
                  grp_type="name"):
        """

        :param name:
        :param df:
        :param is_ensemble:
        :param is_callsite:
        :param gradients:
        :param histograms:
        :param boxplots:
        :param grp_type:
        :return:
        """
        assert grp_type in ['name', 'module']

        _id_col = 'nid' if grp_type == "name" else 'module'
        result = {"name":               name,
                  "id":                 f"{grp_type}-{df[_id_col].unique()[0]}",
                  #"dataset":            df_unique(df, "dataset"),
                  "component_path":     df_unique(df, "component_path"),
                  #"component_level":    df_unique(df, "component_level")
                  }

        #if grp_type == "module":
        #    result["module"] = df_unique(df, "module")

        # now, append the data
        for tk, tv in zip(TIME_COLUMNS, self.time_columns):

            if grp_type == "name":
                _data = df[tv].to_numpy()
            elif grp_type == "module":
                _data = df.groupby(["rank"])[tv].mean().to_numpy()
            else:
                assert False

            # compute the statistics
            _min, _mean, _max = _data.min(), _data.mean(), _data.max()
            _var = _data.var() if _data.shape[0] > 0 else 0.0
            #_std = np.sqrt(_var)
            _imb = (_max - _mean) / _mean if not np.isclose(_mean, 0.0) else _max
            _skew = skew(_data)
            _kurt = kurtosis(_data)

            result[tk] = {"d": _data,
                          "rng": (_min, _max),
                          "uv": (_mean, _var),
                          #"std": _std,
                          "imb": _imb,
                          "ks": (_kurt, _skew)
                          }

            if gradients is not None:
                result[tk]["grd"] = gradients[tk]

            if boxplots is not None:
                result[tk]["box"] = boxplots[tk]

            if histograms is not None:
                result[tk]["hst"] = histograms[tk]

        return result

    # --------------------------------------------------------------------------

    """
    # ------------------------------------------------------------------------------
    # HDF5 methods (Not being used)
    # ------------------------------------------------------------------------------

    def h5_module_data(self):
        module_group_df = self.df.groupby(["module"])
        self.moduleMap = {}
        count = 0
        for module, module_df in module_group_df:
            module_ensemble_df = module_group_df.get_group(module)
            key = "module_" + str(count)
            self.moduleMap[module] = key
            module_ensemble_df.to_hdf(self.moduleh5File, key=key)
            count += 1

    def h5_callsite_data(self):
        name_group_df = self.df.groupby(["name"])
        count = 0
        for name, name_df in name_group_df:
            callsite_ensemble_df = name_group_df.get_group(name)
            key = "callsite_" + str(callsite_ensemble_df["nid"].unique()[0])
            self.callsiteMap[name] = key
            callsite_ensemble_df.to_hdf(self.callsiteh5File, key=key)
            count += 1

    def h5_write(self):
        exDict = {"moduleMap": self.moduleMap, "callsiteMap": self.callsiteMap}
        with open(self.h5IndexFilename, "w") as file:
            file.write(json.dumps(exDict))
            LOGGER.debug(f"writen to file : {self.h5IndexFilename}")

    def h5_read(self):
        f = open(self.h5IndexFilename, "r")
        data = json.load(f)
        return data
        LOGGER.debug("Read the h5 index map.")

    def h5_process(self):
        LOGGER.info("Calculating Gradients, Mean runtime variations, and Distribution.")
        with self.timer.phase("Collect Callsite data"):
            self.callsite_data()
        with self.timer.phase("Collect Module data"):
            self.module_data()
        with self.timer.phase("Write module's and callsite's hdf indexes"):
            self.write_h5()
        LOGGER.info(self.timer)

    def h5_fetch(self):
        ret = {}
        with self.timer.phase("Read module's and callsite's hdf indexes"):
            data = self.read_maps()
            self.moduleMap = data["moduleMap"]
            self.callsiteMap = data["callsiteMap"]
        with self.timer.phase("Collect Callsite data"):
            modules = self.df["module"].unique()
        with self.timer.phase("Filter"):
            if self.filter:
                # topCallsites_df = self.filter_frames(self.topCallsite, "time (inc)")
                topCallsites_df = self.filter_frames(self.topCallsite, "time")
                callsites = topCallsites_df.index.values
                self.df = self.df[self.df["name"].isin(topCallsites_df.index.values)]
            else:
                callsites = self.df["name"].unique().tolist()
        with self.timer.phase("Fetch module"):
            ret["module"] = self.get_data_from_hd5(modules, "module")
        with self.timer.phase("Fetch callsite"):
            ret["callsite"] = self.get_data_from_hd5(callsites, "name")
        with self.timer.phase("Module callsite map data"):
            ret["moduleCallsiteMap"] = self.get_module_callsite_map()
        return ret

    def get_data_from_hd5(self, nodes, col):
        ret = {}
        if col == "module":
            filename = self.moduleh5File
            mapping = self.moduleMap
        elif col == "name":
            filename = self.callsiteh5File
            mapping = self.callsiteMap
        ensemble = {}
        for node in nodes:
            module_ensemble_df = pd.read_hdf(filename, key=mapping[node])
            hists = {"Inclusive": {}, "Exclusive": {}}
            for prop in self.props:
                prop_histograms = self.histogram_by_property_ensemble(
                    module_ensemble_df, prop
                )
                hists["Inclusive"][prop] = prop_histograms["Inclusive"]
                hists["Exclusive"][prop] = prop_histograms["Exclusive"]
            # Calculate gradients
            gradients = {"Inclusive": {}, "Exclusive": {}}
            gradients = Gradients(self.target_df, binCount=self.nbins_run).run(
                columnName=col, callsiteOrModule=node
            )
            quartiles = {"Inclusive": {}, "Exclusive": {}}
            outliers = {"Inclusive": {}, "Exclusive": {}}
            if col == "name":
                boxplot = BoxPlot(module_ensemble_df)
                quartiles = boxplot.q
                outliers = boxplot.outliers
            ensemble[node] = self.pack_json(
                df=module_ensemble_df,
                name=node,
                gradients=gradients,
                prop_hists=hists,
                q=quartiles,
                outliers=outliers,
            )
        ret["ensemble"] = ensemble
        for dataset in self.datasets:
            target = {}
            module_target_df = module_ensemble_df.loc[
                module_ensemble_df["dataset"] == dataset
            ]
            for node in nodes:
                gradients = {"Inclusive": {}, "Exclusive": {}}
                hists = {"Inclusive": {}, "Exclusive": {}}
                quartiles = {"Inclusive": {}, "Exclusive": {}}
                outliers = {"Inclusive": {}, "Exclusive": {}}
                if module_target_df.shape[0] != 0:
                    for prop in self.props:
                        prop_histograms = self.histogram_by_property(
                            module_ensemble_df, module_target_df, prop
                        )
                        hists["Inclusive"][prop] = prop_histograms["Inclusive"]
                        hists["Exclusive"][prop] = prop_histograms["Exclusive"]
                    if col == "name":
                        boxplot = BoxPlot(module_target_df)
                        quartiles = boxplot.q
                        outliers = boxplot.outliers
                    target[node] = self.pack_json(
                        df=module_target_df,
                        name=node,
                        gradients=gradients,
                        prop_hists=hists,
                        q=quartiles,
                        outliers=outliers,
                    )
            ret[dataset] = target
        return ret
    """


# ------------------------------------------------------------------------------
