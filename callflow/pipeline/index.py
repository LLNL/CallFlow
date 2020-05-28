import json
from networkx.readwrite import json_graph
import pandas as pd
import os

from .create_graphframe import CreateGraphFrame

from .group_by_module import groupBy
from .ensemble_group_by_module import ensembleGroupBy
from .filter_hatchet import FilterHatchet
from .filter_networkx import FilterNetworkX
from .hatchet_to_networkx import HatchetToNetworkX
from .union_graph import UnionGraph
from .deltacon_similarity import Similarity
from .process import PreProcess
from .auxiliary import Auxiliary
from .state import State

from callflow.utils import Log


class Pipeline:
    def __init__(self, config):
        self.log = Log("pipeline")
        self.config = config
        self.dirname = self.config.save_path
        self.debug = True

    ##################### Pipeline Functions ###########################
    # All pipeline functions avoid the state being mutated by reference to create separate instances of State variables.

    # Create the State from the hatchet's graphframe.
    def create_gf(self, name):
        state = State(name)
        create = CreateGraphFrame(self.config, name)

        state.entire_gf = create.gf
        state.entire_df = create.df
        state.entire_graph = create.graph

        self.log.info(
            f"Number of call sites in CCT (From dataframe): {len(state.entire_df['name'].unique())}"
        )

        return state

    # Pre-process the dataframe and Graph to add attributes to the networkX graph.
    # PreProcess class is a builder. Additional attributes can be added by chained calls.
    def process_gf(self, state, gf_type):
        if self.config.format[state.name] == "hpctoolkit":
            preprocess = (
                PreProcess.Builder(state, gf_type)
                .add_path()
                .create_name_module_map()
                .add_callers_and_callees()
                .add_dataset_name()
                .add_imbalance_perc()
                .add_module_name_hpctoolkit()
                .add_vis_node_name()
                .build()
            )
        elif self.config.format[state.name] == "caliper_json":
            preprocess = (
                PreProcess.Builder(state, gf_type)
                .add_time_columns()
                .add_rank_column()
                .add_callers_and_callees()
                .add_dataset_name()
                .add_imbalance_perc()
                .add_module_name_caliper(self.config.callsite_module_map)
                .create_name_module_map()
                .add_vis_node_name()
                .add_path()
                .build()
            )

        state.gf = preprocess.gf
        state.df = preprocess.df
        state.graph = preprocess.graph

        self.entire_df = state.df
        return state

    # Converts a hatchet graph to networkX graph.
    def hatchetToNetworkX(self, state, path):
        convert = HatchetToNetworkX(state, path, construct_graph=True, add_data=False)

        state.g = convert.g
        return state

    # Uses the hatchet's filter method.
    # Filter by hatchet graphframe.
    def filterHatchet(self, state, filterBy, filterPerc):
        filter_obj = Filter(state, filterBy, filterPerc)

        state.gf = filter_obj.gf
        state.df = filter_obj.df
        state.graph = filter_obj.graph

        return state

    # Union of all the networkX graphs.
    def union(self, states):
        u_graph = UnionGraph()
        u_df = pd.DataFrame()
        for idx, dataset in enumerate(states):
            u_graph.unionize(states[dataset].g, dataset)
            u_df = pd.concat([u_df, states[dataset].df], sort=True)

        state = State("union")
        state.df = u_df
        state.g = u_graph.R

        if self.debug:
            self.log.info("Done with Union.")
            self.log.info(
                f"Number of callsites in dataframe: {len(state.df['name'].unique())}"
            )
            self.log.info(f"Number of callsites in the graph: {len(state.g.nodes())}")
            self.log.info(
                f"Number of modules in the graph: {len(state.df['module'].unique())}"
            )

        return state

    # Filter the networkX graph based on the attribute specified in the config file.
    def filterNetworkX(self, state, perc):
        filter_obj = FilterNetworkX(state)
        if self.config.filter_by == "time (inc)":
            df = filter_obj.filter_df_by_time_inc(perc)
            g = filter_obj.filter_graph_by_time_inc(df, state.g)
        elif self.config.filter_by == "time":
            df = filter_obj.filter_df_by_time(perc)
            g = filter_obj.filter_graph_by_time(df, state.g)

        state = State("filter_union")
        state.df = df
        state.g = g

        if self.debug:
            self.log.info("Done with Filtering the Union graph.")
            self.log.info(
                f"Number of callsites in dataframe: {len(state.df['name'].unique())}"
            )
            self.log.info(f"Number of callsites in the graph: {len(state.g.nodes())}")
            self.log.info(
                f"Number of modules in the graph: {len(state.df['module'].unique())}"
            )

        return state

    def group(self, state, attr):
        grouped_graph = groupBy(state, attr)
        state.g = grouped_graph.g
        state.df = grouped_graph.df
        return state

    def ensemble_group(self, state, attr):
        grouped_graph = ensembleGroupBy(
            state["ensemble_entire"], state["ensemble_filter"], attr
        ).run()

        state = State("ensemble_union")
        state.g = grouped_graph["g"]
        state.df = grouped_graph["df"]

        if self.debug:
            self.log.info(
                f"Number of callsites in dataframe: {len(state.df['name'].unique())}"
            )
            self.log.info(f"Number of callsites in the graph: {len(state.g.nodes())}")
            self.log.info(f"Modules in the graph: {state.df['module'].unique()}")
        return state

    ##################### Write Functions ###########################
    # Write the dataset's graphframe to the file.
    def write_dataset_gf(self, state, state_name, format_of_df, write_graph=True):
        # dump the filtered dataframe to csv.
        df_filepath = self.dirname + "/" + state_name + "/" + format_of_df + "_df.csv"
        graph_filepath = (
            self.dirname + "/" + state_name + "/" + format_of_df + "_graph.json"
        )

        state.df.to_csv(df_filepath)

        g_data = json_graph.node_link_data(state.g)
        with open(graph_filepath, "w") as graphFile:
            json.dump(g_data, graphFile)

    # Write the ensemble State to the file.
    def write_ensemble_gf(self, states, state_name):
        state = states[state_name]

        # dump the filtered dataframe to csv.
        df_filepath = self.dirname + "/" + state_name + "_df.csv"
        graph_filepath = self.dirname + "/" + state_name + "_graph.json"

        state.df.to_csv(df_filepath)

        g_data = json_graph.node_link_data(state.g)
        with open(graph_filepath, "w") as graphFile:
            json.dump(g_data, graphFile)

    # Write the hatchet graph to a text file.
    def write_hatchet_graph(self, states, state_name):
        state = states[state_name]
        gf = state.gf

        graph_filepath = self.dirname + "/" + state_name + "/hatchet_graph.txt"
        with open(graph_filepath, "a") as hatchet_graphFile:
            hatchet_graphFile.write(gf.tree(color=False))

        graph_filepath = (
            self.dirname + "/" + state_name + "/hatchet_graph_10_percent.txt"
        )
        with open(graph_filepath, "a") as hatchet_graphFile:
            hatchet_graphFile.write(gf.tree(color=False, threshold=0.10))

    ##################### Read Functions ###########################
    # Read the ensemble graph and dataframe.
    def read_ensemble_gf(self, name):
        self.log.info(f"[Process] Reading the union dataframe and graph : {name}")
        state = State(name)
        dirname = self.config.save_path
        union_df_filepath = dirname + "/" + name + "_df.csv"
        union_graph_filepath = dirname + "/" + name + "_graph.json"

        with open(union_graph_filepath, "r") as union_graphFile:
            union_graph = json.load(union_graphFile)
        state.g = json_graph.node_link_graph(union_graph)

        state.df = pd.read_csv(union_df_filepath)

        return state

    # Read a single dataset, pass the dataset name as a parameter.
    def read_dataset_gf(self, name):
        state = State(name)
        self.log.info(
            "[Process] Reading the dataframe and graph of state: {0}".format(name)
        )
        dataset_dirname = os.path.abspath(os.path.join(__file__, "../../..")) + "/data"
        df_filepath = self.dirname + "/" + name + "/entire_df.csv"
        entire_df_filepath = self.dirname + "/" + name + "/entire_df.csv"
        graph_filepath = self.dirname + "/" + name + "/entire_graph.json"
        entire_graph_filepath = self.dirname + "/" + name + "/entire_graph.json"

        parameters_filepath = (
            dataset_dirname + "/" + self.config.runName + "/" + name + "/env_params.txt"
        )

        state.df = pd.read_csv(df_filepath)

        with open(graph_filepath, "r") as filter_graphFile:
            graph = json.load(filter_graphFile)
        state.g = json_graph.node_link_graph(graph)

        if self.config.runName.split("_")[0] == "osu_bcast":
            state.projection_data = {}
            for line in open(parameters_filepath, "r"):
                s = 0
                for num in line.strip().split(","):
                    split_num = num.split("=")
                    state.projection_data[split_num[0]] = split_num[1]

        return state

    # Write the graph similarities to a file.
    def deltaconSimilarity(self, datasets, states, type):
        ret = {}
        for idx, dataset in enumerate(datasets):
            ret[dataset] = []
            for idx_2, dataset2 in enumerate(datasets):
                union_similarity = Similarity(states[dataset2].g, states[dataset].g)
                ret[dataset].append(union_similarity.result)

        dirname = self.config.callflow_dir
        name = self.config.runName
        similarity_filepath = dirname + "/" + "similarity.json"
        with open(similarity_filepath, "w") as json_file:
            json.dump(ret, json_file)

    def read_all_data(self):
        dirname = self.config.callflow_path
        all_data_filepath = os.path.join(self.config.save_path, "all_data.json")
        self.log.info(f"[Read] {all_data_filepath}")
        with open(all_data_filepath, "r") as filter_graphFile:
            data = json.load(filter_graphFile)
        return data
