# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np
from scipy.stats import kurtosis, skew

import callflow
from callflow.utils.df import df_group_by, df_unique, df_lookup_by_column, df_lookup_and_list

from .gradients import Gradients
from .boxplot import BoxPlot
from .histogram import Histogram

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class Auxiliary:

    def __init__(self, sg, selected_runs=None, MPIBinCount: int = 20, RunBinCount: int = 20):

        assert isinstance(sg, (callflow.SuperGraph, callflow.EnsembleGraph))

        self.MPIBinCount = MPIBinCount
        self.RunBinCount = RunBinCount
        self.hist_props = ["rank", "name", "dataset", "all_ranks"]

        if selected_runs is not None:
            self.runs = selected_runs
            self.e_df = sg.df_filter_by_search_string('dataset', self.runs)

        elif isinstance(sg, callflow.SuperGraph) and sg.name != "ensemble":
            self.runs = [sg.name]
            self.e_df = sg.dataframe

        elif isinstance(sg, callflow.EnsembleGraph) and sg.name == "ensemble":
            self.runs = [k for k, v in sg.supergraphs.items()]
            self.e_df = sg.df_filter_by_search_string('dataset', self.runs)

        LOGGER.warning(f'Computing auxiliary data for ({sg}) with {len(self.runs)} runs: {self.runs}')

        # ----------------------------------------------------------------------
        if isinstance(sg, callflow.EnsembleGraph):
            callsites = df_unique(self.e_df, "name")
            modules = df_unique(self.e_df, "module")

            dataframes = {'ensemble': self.e_df}
            dataframes_name_group = {'ensemble': df_group_by(self.e_df, "name")}
            dataframes_module_group = {'ensemble': df_group_by(self.e_df, "module")}

            for dataset in self.runs:
                dataframes[dataset] = df_lookup_by_column(self.e_df, "dataset", dataset)
                dataframes_name_group[dataset] = df_group_by(dataframes[dataset], "name")
                dataframes_module_group[dataset] = df_group_by(dataframes[dataset], "module")

        else:
            df = df_lookup_by_column(self.e_df, "dataset", sg.name)
            callsites = df_unique(df, "name")
            modules = df_unique(df, "module")
            dataframes = {sg.name: df}
            dataframes_name_group = {sg.name: df_group_by(df, "name")}
            dataframes_module_group = {sg.name: df_group_by(df, "module")}

        # ----------------------------------------------------------------------
        self.result = {
            "dataset": self._collect_data_dataset(dataframes, sg),
            "callsite": self._collect_data(dataframes_name_group, 'callsite'),
            "module":   self._collect_data(dataframes_module_group, 'module'),
            "callsiteModuleMap": self._callsite_module_map(dataframes, callsites),
            "moduleCallsiteMap": self._module_callsite_map(dataframes, modules),
            "moduleFctList": sg.module_fct_list,
            "runs": self.runs,
        }

        # TODO: this should not happen this way
        sg.auxiliary_data = self.result

    def _collect_data_dataset(self, dfs, sg):
        _COLUMNS_OF_INTEREST = ['node', 'rank', 'time (inc)', 'time', 'dataset', 'component_level', 'module', 'name']
        
        _json = {}
        for k, v in dfs.items():
            _df = v[_COLUMNS_OF_INTEREST]
            
            _num_callsites = len(_df['name'].unique().tolist()) # Number of call sites
            _num_ranks = len(_df['rank'].unique().tolist()) # Number of ranks
            _run_time = _df['time (inc)'].max() # Maximum inclusive runtime
            _num_modules = len(sg.module_fct_list) if "module" in _df.columns else 0 # Number of modules
            _num_edges = len(sg.nxg.edges())

            _json[k] = {
                "num_callsites": _num_callsites,
                "num_ranks": _num_ranks,
                "run_time": _run_time,
                "num_modules": _num_modules,
                "num_edges": _num_edges,
            }

        return _json

    # --------------------------------------------------------------------------
    def _collect_data(self, dataframes_group, grp_type='callsite'):

        is_callsite = grp_type == 'callsite'
        result = {}

        # for each supergraph
        for dataset, df_group in dataframes_group.items():

            is_ensemble = dataset == 'ensemble'
            result[dataset] = {}

            # for each name in the group
            for name, name_df in df_group:

                histogram, gradients, boxplot = None, None, None

                # --------------------------------------------------------------
                if is_ensemble:
                    histogram = Histogram(df_ensemble=name_df).result
                    gradients = Gradients(name_df,
                                          bins=self.RunBinCount,
                                          callsiteOrModule=name).result

                elif "ensemble" in dataframes_group:
                    assert not name_df.empty
                    ensemble_df = dataframes_group['ensemble'].get_group(name)
                    histogram = Histogram(df_ensemble=ensemble_df,
                                          df_target=name_df).result

                else:
                    histogram = Histogram(df_ensemble=name_df).result

                # --------------------------------------------------------------
                # if grp_type == 'callsite':
                boxplot = BoxPlot(name_df).result

                # --------------------------------------------------------------
                result[dataset][name] = self.pack_json(name=name, df=name_df,
                                                       is_ensemble=is_ensemble,
                                                       is_callsite=is_callsite,
                                                       gradients=gradients,
                                                       histograms=histogram,
                                                       boxplots=boxplot,
                                                       grp_type=grp_type)

        return result

    # TODO: Figure out where this should belong.
    def _callsite_module_map(self, dataframes, callsites):
        return {
            __ : {
                _ : df_lookup_and_list(df, "name", _, "module") \
                for _ in callsites \
                } \
            for __, df in dataframes.items() 
        }

    def _module_callsite_map(self, dataframes, modules):
        return {
            __ : {
                int(_) : df_lookup_and_list(df, "module", _, "name") \
                for _ in modules \
                } \
            for __, df in dataframes.items()
        }
        
    # --------------------------------------------------------------------------
    @staticmethod
    def pack_json(name, df, is_ensemble, is_callsite,
                  gradients = None, histograms = None, boxplots = None, grp_type="callsite"):

        KEYS_AND_ATTRS = {'Inclusive': 'time (inc)',
                          'Exclusive': 'time'}

        # create the dictionary with base info
        if grp_type == "callsite":
            result = {
                "name": name,
                "id": f"{grp_type}-{df['nid'].unique()[0]}",
                "dataset": df["dataset"].unique(),
                "module": df["module"].unique(),
                "component_path": df["component_path"].unique(),
                "component_level": df["component_level"].unique()
            }
        elif grp_type == "module":
            result = {
                "name": name,
                "id": f"{grp_type}-{df['module'].unique()[0]}",
                "dataset": df["dataset"].unique(),
                "component_path": df["component_path"].unique(),
                "component_level": df["component_level"].unique()
            }

        # now, append the data
        for k, a in KEYS_AND_ATTRS.items():

            if grp_type == "callsite":
                _data = df[a].to_numpy()
            elif grp_type == "module":
                _data = df.groupby(['rank'])[a].mean().to_numpy()

            # compute the statistics
            _min, _mean, _max = _data.min(), _data.mean(), _data.max()
            _var = _data.var() if _data.shape[0] > 0 else 0.
            _std = np.sqrt(_var)
            _imb = (_max - _mean) / _mean if not np.isclose(_mean, 0.) else _max
            _skew = skew(_data)
            _kurt = kurtosis(_data)

            result[k] = {"d": _data,
                         "min": _min,
                         "mean": _mean,
                         "max": _max,
                         "var": _var,
                         "std": _std,
                         "imb": _imb,
                         "kurt": _kurt,
                         "skew": _skew
            }

            if gradients is not None:
                result[k]['gradients'] = gradients[k]

            if boxplots is not None:
                result[k]['boxplots'] = boxplots[k]

            if histograms is not None:
                result[k]['hists'] = histograms[k]

        return result

    # --------------------------------------------------------------------------

    '''
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
            gradients = Gradients(self.target_df, binCount=self.RunBinCount).run(
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
    '''
# ------------------------------------------------------------------------------