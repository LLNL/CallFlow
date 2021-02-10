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
from scipy.stats import kurtosis, skew

import callflow
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
                 MPIBinCount: int = 20, RunBinCount: int = 20):
        """
        Constructor
        :param sg: SuperGraph
        :param selected_runs: Array of selected runs
        :param MPIBinCount: Bin count for MPI-level histogram
        :param RunBinCount: Bin count for run-level histogram
        """
        assert isinstance(sg, (callflow.SuperGraph, callflow.EnsembleGraph))

        self.MPIBinCount = MPIBinCount
        self.RunBinCount = RunBinCount
        #self.hist_props = ["rank", "name", "dataset", "all_ranks"]

        self.proxy_columns = sg.proxy_columns
        self.time_columns = [self.proxy_columns.get(_, _) for _ in TIME_COLUMNS]

        self.runs = sg.filter_by_datasets(selected_runs)

        LOGGER.warning(f"Computing auxiliary data for ({sg}) with "
                       f"{len(self.runs)} runs: {self.runs}")

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
            df = df_lookup_by_column(sg.dataframe, "dataset", sg.name)
            callsites = df_unique(df, "name")
            modules = df_unique(df, "module")
            dataframes = {sg.name: df}
            dataframes_name_group = {sg.name: df_group_by(df, "name")}
            dataframes_module_group = {sg.name: df_group_by(df, "module")}

        # ----------------------------------------------------------------------
        self.result = {
            "runs": self.runs,
            "moduleFctList": sg.module_fct_list,
            "callsiteModuleMap": self._callsite_module_map(dataframes, callsites),
            "moduleCallsiteMap": self._module_callsite_map(dataframes, modules),

            "runtimeProps": self._runtime_props(dataframes),
            "dataset": self._collect_data_dataset(dataframes, sg),

            "callsite": self._collect_data(dataframes_name_group, "callsite"),
            "module": self._collect_data(dataframes_module_group, "module")
        }

        # TODO: this should not happen this way
        sg.auxiliary_data = self.result

    def _runtime_props(self, dataframes):
        """
        Adds runtime information, e.g., max, min inclusive and exclusive runtime.

        :param dataframes:
        :return:
        """
        props = {_: {} for _ in TIME_COLUMNS + ['nranks']}

        # gather the data for ensemble
        trng = (100000,0)
        tirng = (100000, 0)
        nranks = 0

        for idx, tag in enumerate(dataframes):
            _trng = df_minmax(dataframes[tag], 'time', self.proxy_columns)
            _tirng = df_minmax(dataframes[tag], 'time (inc)', self.proxy_columns)
            _nranks = df_count(dataframes[tag], "rank", self.proxy_columns)

            props['time'][tag] = _trng
            props['time (inc)'][tag] = _tirng
            props["nranks"][tag] = _nranks

            # collect for ensemble
            trng = (min(trng[0], _trng[0]), max(trng[1], _trng[1]))
            tirng = (min(tirng[0], _tirng[0]), max(tirng[1], _tirng[1]))
            nranks = max(nranks, _nranks)

        tag = 'ensemble'
        props['time'][tag] = trng
        props['time (inc)'][tag] = tirng
        props['nranks'][tag] = nranks

        '''
        props = {}
        props["maxIncTime"] = {}
        props["maxExcTime"] = {}
        props["minIncTime"] = {}
        props["minExcTime"] = {}
        props["numOfRanks"] = {}
        maxIncTime = 0
        maxExcTime = 0
        minIncTime = 0
        minExcTime = 0
        maxNumOfRanks = 0
        for idx, tag in enumerate(dataframes):
            props["maxIncTime"][tag] = dataframes[tag]["time (inc)"].max()
            props["maxExcTime"][tag] = dataframes[tag]["time"].max()
            props["minIncTime"][tag] = dataframes[tag]["time (inc)"].min()
            props["minExcTime"][tag] = dataframes[tag]["time"].min()
            props["numOfRanks"][tag] = len(dataframes[tag]["rank"].unique())
            maxExcTime = max(props["maxExcTime"][tag], maxExcTime)
            maxIncTime = max(props["maxIncTime"][tag], maxIncTime)
            minExcTime = min(props["minExcTime"][tag], minExcTime)
            minIncTime = min(props["minIncTime"][tag], minIncTime)
            maxNumOfRanks = max(props["numOfRanks"][tag], maxNumOfRanks)

        props["maxIncTime"]["ensemble"] = maxIncTime
        props["maxExcTime"]["ensemble"] = maxExcTime
        props["minIncTime"]["ensemble"] = minIncTime
        props["minExcTime"]["ensemble"] = minExcTime
        props["numOfRanks"]["ensemble"] = maxNumOfRanks
        '''
        return props

    def _collect_data_dataset(self, dataframes, sg):
        """

        :param dataframes:
        :param sg:
        :return:
        """
        _COLUMNS_OF_INTEREST = ["node", "rank", "time", "time (inc)",
                                "dataset", "module", "name", "component_level"]

        _json = {}
        for k, df in dataframes.items():

            _df = df_fetch_columns(df, _COLUMNS_OF_INTEREST, self.proxy_columns)
            _num_modules = len(sg.module_fct_list) if "module" in _df.columns else 0

            '''
            _num_callsites = len(_df["name"].unique().tolist())  # Number of call sites
            _num_ranks = len(_df["rank"].unique().tolist())  # Number of ranks
            _run_time = _df["time (inc)"].max()  # Maximum inclusive runtime
            _num_edges = len(sg.nxg.edges())
            '''

            _json[k] = {
                "num_callsites": df_count(_df, "name", self.proxy_columns),
                "num_ranks": df_count(_df, "rank", self.proxy_columns),
                "run_time": df_minmax(_df, "time (inc)", self.proxy_columns)[1],
                "num_modules": _num_modules,
                "num_edges": len(sg.nxg.edges()),
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
                    histogram = Histogram(df_ensemble=name_df,
                                          proxy_columns=self.proxy_columns).result

                    gradients = Gradients(name_df,
                                          proxy_columns=self.proxy_columns,
                                          bins=self.RunBinCount,
                                          callsiteOrModule=name).result

                elif "ensemble" in dataframes_group:
                    assert not name_df.empty
                    ensemble_df = dataframes_group["ensemble"].get_group(name)

                    histogram = Histogram(df_ensemble=ensemble_df,
                                          df_target=name_df,
                                          proxy_columns=self.proxy_columns).result
                else:
                    histogram = Histogram(df_ensemble=name_df,
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
        return {
            _name: {_: df_lookup_and_list(_df, "name", _, "module") for _ in callsites}
            for _name, _df in dataframes.items()
        }

    def _module_callsite_map(self, dataframes, modules):
        """

        :param dataframes:
        :param modules:
        :return:
        """
        return {
            _name: {int(_): df_lookup_and_list(_df, "module", _, "name") for _ in modules}
            for _name, _df in dataframes.items()
        }

    # --------------------------------------------------------------------------
    def pack_json(self, name, df, is_ensemble, is_callsite,
                  gradients=None, histograms=None, boxplots=None,
                  grp_type="callsite"):
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
        assert grp_type in ['callsite', 'module']

        _id_col = 'nid' if grp_type == "callsite" else 'module'
        result = {"name":               name,
                  "id":                 f"{grp_type}-{df[_id_col].unique()[0]}",
                  "dataset":            df_unique(df, "dataset"),
                  "component_path":     df_unique(df, "component_path"),
                  "component_level":    df_unique(df, "component_level")
                  }

        if grp_type == "module":
            result["module"] = df_unique(df, "module")

        # now, append the data
        for tk, tv in zip(TIME_COLUMNS, self.time_columns):

            if grp_type == "callsite":
                _data = df[tv].to_numpy()
            elif grp_type == "module":
                _data = df.groupby(["rank"])[tv].mean().to_numpy()
            else:
                assert False

            # compute the statistics
            _min, _mean, _max = _data.min(), _data.mean(), _data.max()
            _var = _data.var() if _data.shape[0] > 0 else 0.0
            _std = np.sqrt(_var)
            _imb = (_max - _mean) / _mean if not np.isclose(_mean, 0.0) else _max
            _skew = skew(_data)
            _kurt = kurtosis(_data)

            result[tk] = {"d": _data,
                          "min": _min, "max": _max,
                          "mean": _mean, "var": _var, "std": _std,
                          "imb": _imb, "kurt": _kurt, "skew": _skew
                          }

            if gradients is not None:
                result[tk]["gradients"] = gradients[tk]

            if boxplots is not None:
                result[tk]["boxplots"] = boxplots[tk]

            if histograms is not None:
                result[tk]["hists"] = histograms[tk]

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
    """


# ------------------------------------------------------------------------------
