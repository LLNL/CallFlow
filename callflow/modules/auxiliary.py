# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

#import os
#import sys
#import json
import math
#import numpy as np

import callflow

from callflow.utils.utils import df_group_by, df_unique, df_lookup_by_column, df_lookup_and_list
from .gradients import Gradients
from .boxplot import BoxPlot
from .histogram import Histogram

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class Auxiliary:

    def __init__(self, sg, MPIBinCount: int = 20, RunBinCount: int = 20):

        assert isinstance(sg, (callflow.SuperGraph, callflow.EnsembleGraph))

        self.MPIBinCount = MPIBinCount
        self.RunBinCount = RunBinCount
        self.hist_props = ["rank", "name", "dataset", "all_ranks"]

        self.runs = sg.config["parameter_props"]["runs"]

        LOGGER.warning(f'Computing auxiliary data for ({sg}) with {len(self.runs)} runs: {self.runs}')
        #if sg.name is not 'ensemble':
        #    #print ('>>> returning')
        #    #return

        if len(self.runs) == 1:
            self.e_df = sg.dataframe
        else:
            self.e_df = sg.df_filter_by_search_string('dataset', self.runs)

        # TODO: it appears aux is computed n times for all n supergraphs
        '''    
        if len(self.runs) > 1:
            self.e_df = Auxiliary.select_rows(supergraph.dataframe, self.runs)
        else:
            self.e_df = supergraph.dataframe
        '''
        '''
        # TODO: remove this and create a single dict
        # copy from the three functions below
        self.e_name_group_df = df_group_by(self.e_df, "name")
        self.e_module_group_df = df_group_by(self.e_df, "module")
        self.e_module_name_group_df = df_group_by(self.e_df, ["module", "name"])
        
        self.t_df = {}
        self.t_module_group_df = {}
        self.t_module_name_group_df = {}
        self.t_name_group_df = {}
        for dataset in self.runs:
            self.t_df[dataset] = self.e_df.loc[self.e_df["dataset"] == dataset]
            self.t_name_group_df[dataset] = df_group_by(self.t_df[dataset], "name")
            self.t_module_group_df[dataset] = df_group_by(self.t_df[dataset], "module")
            self.t_module_name_group_df[dataset] = df_group_by(self.t_df[dataset], ["module", "name"])
        '''
        # ----------------------------------------------------------------------
        if isinstance(sg, callflow.EnsembleGraph):
            callsites = df_unique(self.e_df, "name")

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
            dataframes = {sg.name: df}
            dataframes_name_group = {sg.name: df_group_by(df, "name")}
            dataframes_module_group = {sg.name: df_group_by(df, "module")}

        # ----------------------------------------------------------------------
        self.result = {
            "callsite": self._core_data(dataframes_name_group, 'callsite'),
            "module":   self._core_data(dataframes_module_group, 'module'),
            "moduleCallsiteMap": self.callsite_module_map(dataframes, callsites)
        }

    # --------------------------------------------------------------------------
    def _core_data(self, dataframes_group, grp_type='callsite'):

        is_callsite = grp_type == 'callsite'
        ret = {}

        # for each supergraph
        for dataset, df_group in dataframes_group.items():

            is_ensemble = dataset == 'ensemble'
            ret[dataset] = {}

            # for each name in the group
            for name, name_df in df_group:

                histogram, gradients, boxplot = None, None, None

                # --------------------------------------------------------------
                if is_ensemble:
                    # LOGGER.debug(f'-------- aux for {grp_type}={name}: 1 '
                    #             f'{dataset} {type(name_df)} : {len(dataframes_group)}')
                    histogram = Histogram(df_ensemble=name_df).result
                    gradients = Gradients(name_df,
                                          binCount=self.RunBinCount,
                                          callsiteOrModule=name).result

                elif "ensemble" in dataframes_group:

                    assert not name_df.empty
                    ensemble_df = dataframes_group['ensemble'].get_group(name)

                    # LOGGER.debug(f'-------- aux for {grp_type}={name}: 2 not empty '
                    #             f'{dataset} {type(ensemble_df)} {type(name_df)}')
                    histogram = Histogram(df_ensemble=ensemble_df,
                                          df_target=name_df).result

                else:
                    # LOGGER.debug(f'-------- aux for {grp_type}={name}: 3 not empty '
                    #             f'{dataset}  {type(name_df)}')
                    histogram = Histogram(df_ensemble=name_df).result


                # collect results
                if grp_type == 'callsite':
                    boxplot = BoxPlot(name_df).result
                    ret[dataset][name] = self.pack_json(name=name,
                                                        df=name_df,
                                                        prop_hists=histogram,
                                                        gradients=gradients,
                                                        q=boxplot['q'],
                                                        outliers=boxplot['outliers'],
                                                        isEnsemble=is_ensemble,
                                                        isCallsite=is_callsite)
                else:
                    ret[dataset][name] = self.pack_json(name=name,
                                                        df=name_df,
                                                        prop_hists=histogram,
                                                        gradients=gradients,
                                                        isEnsemble=is_ensemble)


    # --------------------------------------------------------------------------
    # Callsite grouped information
    # TODO: Need to clean up this further.
    def _delete_callsite_data(self):

        # ----------------------------------------------------------------------
        dataframes_name_group = {'ensemble': self.e_name_group_df}
        for dataset in self.runs:
            dataframes_name_group[dataset] = self.t_name_group_df[dataset]

        # ----------------------------------------------------------------------
        ret = {}

        # for each supergraph
        for dataset, df_name_grp in dataframes_name_group.items():

            is_ensemble = dataset == 'ensemble'
            ret[dataset] = {}

            # for each callsite
            for callsite, callsite_df in df_name_grp:
                histogram, gradients, boxplot = None, None, None

                if is_ensemble:
                    histogram = Histogram(ensemble_df=callsite_df).result
                    gradients = Gradients(self.t_df,
                                          binCount=self.RunBinCount,
                                          callsiteOrModule=callsite).result
                    boxplot = BoxPlot(callsite_df)
                else:
                    callsite_ensemble_df = dataframes_name_group['ensemble'].get_group(callsite)
                    histogram = Histogram(ensemble_df=callsite_ensemble_df,
                                          target_df=callsite_df).result
                    boxplot = BoxPlot(callsite_df)

                ret[dataset][callsite] = self.pack_json(name=callsite,
                                                    df=callsite_df,
                                                    prop_hists=histogram,
                                                    gradients=gradients,
                                                    q=boxplot.q,
                                                    outliers=boxplot.outliers,
                                                    isEnsemble=is_ensemble,
                                                    isCallsite=True)

        # ----------------------------------------------------------------------
        '''
        # Create the data dict.
        ensemble = {}
        for callsite, callsite_df in self.e_name_group_df:
            callsite_ensemble_df = self.e_name_group_df.get_group(callsite)
            histograms = Histogram(ensemble_df=callsite_ensemble_df)
            gradients = Gradients(self.t_df, binCount=self.RunBinCount, callsiteOrModule=callsite)
            boxplot = BoxPlot(callsite_df)
            ensemble[callsite] = self.pack_json(
                callsite_df,
                callsite,
                gradients=gradients.result,
                q=boxplot.q,
                outliers=boxplot.outliers,
                prop_hists=histograms.result,
                isEnsemble=True,
                isCallsite=True,
            )
        ret["ensemble"] = ensemble

        ## Target data.
        # Loop through datasets and group the callsite by name.
        for dataset in self.runs:
            name_grouped = self.t_name_group_df[dataset]
            target = {}
            for callsite, callsite_df in name_grouped:
                callsite_ensemble_df = self.e_name_group_df.get_group(callsite)
                callsite_target_df = callsite_df
                if not callsite_df.empty:
                    histogram = Histogram(ensemble_df=callsite_ensemble_df, target_df=callsite_target_df)
                    boxplot = BoxPlot(callsite_df)
                    target[callsite] = self.pack_json(
                        df=callsite_target_df,
                        name=callsite,
                        prop_hists=histogram.result,
                        q=boxplot.q,
                        outliers=boxplot.outliers,
                        isEnsemble=False,
                        isCallsite=True,
                    )
            ret[dataset] = target
        '''
        return ret

    # Module grouped information.
    # TODO: Need to clean up this further.
    def _delete_module_data(self):

        # ----------------------------------------------------------------------
        dataframes_module_group = {'ensemble': self.e_module_group_df}
        for dataset in self.runs:
            dataframes_module_group[dataset] = self.t_module_group_df[dataset]

        # ----------------------------------------------------------------------
        ret = {}

        # for each supergraph
        for dataset, df_mod_grp in dataframes_module_group.items():

            is_ensemble = dataset=='ensemble'
            ret[dataset] = {}

            # for each module
            for module, module_df in df_mod_grp:

                histogram, gradients = None, None
                if is_ensemble:

                    histogram = Histogram(ensemble_df=module_df).result
                    gradients = Gradients(self.t_df,
                                          binCount=self.RunBinCount,
                                          callsiteOrModule=module).result
                    boxplot = BoxPlot(module_df)


                elif not module_df.empty:

                    module_ensemble_df = dataframes_module_group['ensemble'].get_group(module)
                    histogram = Histogram(ensemble_df=module_ensemble_df,
                                          target_df=module_df).result
                    boxplot = BoxPlot(module_df)
                    

                ret[dataset][module] = self.pack_json(name=module, df=module_df,
                                                      gradients=gradients,
                                                      prop_hists=histogram,
                                                      isEnsemble=is_ensemble)

        # ----------------------------------------------------------------------
        '''
        ret = {}
        # Module grouped information
        ensemble = {}
        for module, module_df in self.e_module_group_df:
            module_ensemble_df = self.e_module_group_df.get_group(module)
            histogram = Histogram(ensemble_df=module_ensemble_df)
            gradients = Gradients(self.t_df, binCount=self.RunBinCount, callsiteOrModule=module)
            ensemble[module] = self.pack_json(
                df=module_df,
                name=module,
                gradients=gradients.result,
                prop_hists=histogram.result,
                isEnsemble=True,
            )
        ret["ensemble"] = ensemble
        
        for dataset in self.runs:
            target = {}
            module_group_df = self.t_module_group_df[dataset]
            for module, module_df in module_group_df:
                module_ensemble_df = self.e_module_group_df.get_group(module)
                module_target_df = module_df
                if not module_target_df.empty:
                    histogram = Histogram(ensemble_df=module_ensemble_df, target_df=module_target_df)
                    target[module] = self.pack_json(
                        df=module_target_df,
                        name=module,
                        gradients=gradients.result,
                        prop_hists=histogram.result,
                        isEnsemble=False,
                    )
            ret[dataset] = target
        '''
        return ret

    '''
    @staticmethod
    def select_rows(df, search_strings):
        unq, IDs = np.unique(df["dataset"], return_inverse=True)
        unqIDs = np.searchsorted(unq, search_strings)
        mask = np.isin(IDs, unqIDs)
        return df[mask]
    
    # TODO: Need to clean up this further.
    # TODO: Figure out where this should belong.
    def get_module_callsite_map(self):
        ret = {}
        ret["ensemble"] = self.module_group_df["name"].unique().apply(lambda d: d.tolist()).to_dict()
        
        for dataset in self.datasets:
            ret[dataset] = self.t_module_group_df[dataset]["name"].unique().apply(lambda d: d.tolist()).to_dict()
        
        return ret
    '''

    # TODO: Figure out where this should belong.
    def callsite_module_map(self, dataframes, callsites):

        '''
        # TODO: move this to init?
        dataframes = {'ensemble': self.e_df}
        for dataset in self.runs:
            dataframes[dataset] = self.t_df[dataset]
        callsites = df_unique(self.e_df, "name")
        '''
        ret = {}

        for dataset, df in dataframes.items():
            ret[dataset] = {}
            for callsite in callsites:
                ret[dataset][callsite] = df_lookup_and_list(df, "name", callsite, "module").tolist()


        '''
        ret = {}
        callsites = self.e_df["name"].unique().tolist()
        for callsite in callsites:
            ret[callsite] = self.e_df.loc[self.e_df["name"] == callsite]["module"].unique().tolist()
        
        for dataset in self.runs:
            ret[dataset] = {}
            #TODO: suraj, is this a bug? should this be module?
            for callsite in callsites:
                ret[dataset][callsite] = self.t_df[dataset].loc[self.t_df[dataset]["name"] == callsite]["name"].unique().tolist()
        '''
        return ret

    # TODO: Need to clean up this further.
    @staticmethod
    def pack_json(
        df,
        name="",
        gradients={"Inclusive": {}, "Exclusive": {}},
        prop_hists={"Inclusive": {}, "Exclusive": {}},
        q={"Inclusive": {}, "Exclusive": {}},
        outliers={"Inclusive": {}, "Exclusive": {}},
        isEnsemble=False,
        isCallsite=False,
    ):
        if gradients is None:
            gradients={"Inclusive": {}, "Exclusive": {}}

        inclusive_variance = df["time (inc)"].var()
        exclusive_variance = df["time"].var()
        inclusive_std_deviation = math.sqrt(df["time (inc)"].var())
        exclusive_std_deviation = math.sqrt(df["time"].var())
        if math.isnan(inclusive_variance):
            inclusive_variance = 0
            inclusive_std_deviation = 0
        if math.isnan(exclusive_variance):
            exclusive_variance = 0
            exclusive_std_deviation = 0
        if isCallsite:
            if isEnsemble:
                time_inc = []
                time = []
            else:
                time_inc = df["time (inc)"].tolist()
                time = df["time"].tolist()
        else:
            if isEnsemble:
                time_inc = []
                time = []
            else:
                module_df = df.groupby(["module", "rank"]).mean()
                x_df = module_df.xs(name, level="module")
                time_inc = x_df["time (inc)"].tolist()
                time = x_df["time"].tolist()
        result = {
            "name": name,
            "id": "node-" + str(df["nid"].tolist()[0]),
            "dataset": df["dataset"].unique().tolist(),
            "module": df["module"].tolist()[0],
            "component_path": df["component_path"].unique().tolist(),
            "component_level": df["component_level"].unique().tolist(),
            "Inclusive": {
                "data": time_inc,
                "mean_time": df["time (inc)"].mean(),
                "max_time": df["time (inc)"].max(),
                "min_time": df["time (inc)"].min(),
                "variance": inclusive_variance,
                "q": q["Inclusive"],
                "outliers": outliers["Inclusive"],
                "imbalance_perc": df['imbalance_perc_inclusive'].tolist()[0],
                "std_deviation": inclusive_std_deviation,
                "kurtosis": df['kurtosis_inclusive'].tolist()[0],
                "skewness": df['skewness_inclusive'].tolist()[0],
                "gradients": gradients["Inclusive"],
                "prop_histograms": prop_hists["Inclusive"],
            },
            "Exclusive": {
                "data": time,
                "mean_time": df["time"].mean(),
                "max_time": df["time"].max(),
                "min_time": df["time"].min(),
                "variance": exclusive_variance,
                "q": q["Exclusive"],
                "outliers": outliers["Exclusive"],
                "imbalance_perc": df['imbalance_perc_exclusive'].tolist()[0],
                "std_deviation": exclusive_std_deviation,
                "skewness": df['skewness_exclusive'].tolist()[0],
                "kurtosis": df['kurtosis_exclusive'].tolist()[0],
                "gradients": gradients["Exclusive"],
                "prop_histograms": prop_hists["Exclusive"],
            },
        }
        return result

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
            modules = self.df["module"].unique().tolist()
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