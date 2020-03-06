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
from ensemble.actions.auxiliary import Auxiliary

from utils.logger import log
from pipeline.state import State
import utils


class Pipeline:
    def __init__(self, config):
        self.config = config
        self.dirname = self.config.processed_path + "/" + self.config.runName
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

        log.info(f"Number of call sites in CCT (From dataframe): {len(state.entire_df['name'].unique())}")

        return state

    # Pre-process the dataframe and Graph to add attributes to the networkX graph.
    # PreProcess class is a builder. Additional attributes can be added by chained calls.
    def process_gf(self, state, gf_type):
        log.info(f"Format: {self.config.format}, dataset: {state.name}")
        if(self.config.format[state.name] == 'hpctoolkit'):
            preprocess = (
                PreProcess.Builder(state, gf_type)
                    .add_path()
                    .add_n_index()
                    .add_callers_and_callees()
                    .add_show_node()
                    .add_vis_node_name()
                    .add_dataset_name()
                    .add_imbalance_perc()
                    .add_module_name_hpctoolkit()
                    .add_mod_index()
                    .build()
                )
        elif(self.config.format[state.name] == 'caliper_json'):
            preprocess = (
                PreProcess.Builder(state, gf_type)
                    .add_n_index()
                    .add_callers_and_callees()
                    .add_show_node()
                    .add_vis_node_name()
                    .add_dataset_name()
                    .add_imbalance_perc()
                    .add_module_name_caliper(self.config.callsite_module_map)
                    .add_mod_index()
                    .add_path()
                    .build()
                )

        state.gf = preprocess.gf
        state.df = preprocess.df
        state.graph = preprocess.graph

        self.entire_df = state.df

        return state

    # Converts a hatchet graph to networkX graph.
    def convertToNetworkX(self, state, path):
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
            u_df = pd.concat([u_df, states[dataset].df], sort=False )

        state = State("union")
        state.df = u_df
        state.g = u_graph.R

        if(self.debug):
            log.info("Done with Union.")
            log.info(f"Number of callsites in dataframe: {len(state.df['name'].unique())}")
            log.info(f"Number of callsites in the graph: {len(state.g.nodes())}")
            log.info(f"Number of modules in the graph: {len(state.df['module'].unique())}")

        return state

    # Filter the networkX graph based on the attribute specified in the config file.
    def filterNetworkX(self, state, perc):
        filter_obj = FilterNetworkX(state)
        if(self.config.filter_by == "time (inc)"):
            df = filter_obj.filter_df_by_time_inc(perc)
            g = filter_obj.filter_graph_by_time_inc(df, state.g)
        elif(self.config.filter_by == 'time'):
            df = filter_obj.filter_df_by_time(perc)
            g = filter_obj.filter_graph_by_time(df, state.g)

        state = State("filter_union")
        state.df = df
        state.g = g

        if(self.debug):
            log.info("Done with Filtering the Union graph.")
            log.info(f"Number of callsites in dataframe: {len(state.df['name'].unique())}")
            log.info(f"Number of callsites in the graph: {len(state.g.nodes())}")
            log.info(f"Number of modules in the graph: {len(state.df['module'].unique())}")

        return state

    def group(self, state, attr):
        grouped_graph = groupBy(state, attr)
        state.g = grouped_graph.g
        state.df = grouped_graph.df
        return state

    def ensemble_group(self, state, attr):
        grouped_graph = ensembleGroupBy(state['ensemble_entire'], state['ensemble_filter'], attr).run()

        state = State('ensemble_union')
        state.g = grouped_graph['g']
        state.df = grouped_graph['df']


        if(self.debug):
            log.info("Done with Ensemb;le supergraph.")
            log.info(f"Number of callsites in dataframe: {len(state.df['name'].unique())}")
            log.info(f"Number of callsites in the graph: {len(state.g.nodes())}")
            log.info(f"Number of modules in the graph: {len(state.df['module'].unique())}")
        return state

    def write_callsite_information(self, states):
        auxiliary = Auxiliary(states,
                              module=action['module'], \
                              sortBy=action['sortBy'],
                              binCount=action["binCount"], datasets=action['datasets'], config=self.config, process=True)

    ##################### Write Functions ###########################

    # Write a graphframe to a file. (i.e., df => .csv, graph => .json)
    def write_gf(self, state, state_name, format_of_df, write_graph=True):
        log.info("writing file for {0} format".format(format_of_df))
        if write_graph:
            # dump the entire_graph as literal
            graph_literal = state.graph.to_literal(
                graph=state.graph, dataframe=state.df
            )
            graph_filepath = (
                self.dirname + "/" + state_name + "/" + format_of_df + "_graph.json"
            )
            utils.debug("File path: {0}".format(graph_filepath))
            with open(graph_filepath, "w") as graphFile:
                json.dump(graph_literal, graphFile)

        # dump the filtered dataframe to csv.
        df_filepath = self.dirname + "/" + state_name + "/" + format_of_df + "_df.csv"
        state.entire_df.to_csv(df_filepath)

    # Write the dataset's graphframe to the file.
    def write_dataset_gf(self, state, state_name, format_of_df, write_graph=True):
        log.info("writing file for {0} format".format(format_of_df))

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
        log.info("writing file for {0} format".format(state_name))

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
    # Read the unprocessed dataframe and graph.
    def read_entire_gf(self, dataset):
        log.info("[Process] Reading the entire dataframe and graph")
        state = State(dataset)
        dirname = self.config.processed_path
        entire_df_filepath = dirname + "/" + dataset + "/entire_df.csv"
        entire_graph_filepath = dirname + "/" + dataset + "/entire_graph.json"

        with open(entire_graph_filepath, "r") as entire_graphFile:
            entire_data = json.load(entire_graphFile)

        state.entire_gf = ht.GraphFrame.from_literal(entire_data)

        state.entire_df = pd.read_csv(entire_df_filepath)
        state.entire_graph = state.entire_gf.graph

        return state

    # Read the ensemble graph and dataframe.
    def read_ensemble_gf(self):
        name = "ensemble"
        log.info(f"[Process] Reading the union dataframe and graph : {name}")
        state = State(name)
        dirname = self.config.processed_path
        union_df_filepath = dirname + "/" + self.config.runName + "/" + name + "_df.csv"
        union_graph_filepath = (
            dirname + "/" + self.config.runName + "/" + name + "_graph.json"
        )

        with open(union_graph_filepath, "r") as union_graphFile:
            union_graph = json.load(union_graphFile)
        state.g = json_graph.node_link_graph(union_graph)

        state.df = pd.read_csv(union_df_filepath)

        return state

    # Read a single dataset, pass the dataset name as a parameter.
    def read_dataset_gf(self, name):
        state = State(name)
        log.info("[Process] Reading the dataframe and graph of state: {0}".format(name))
        dataset_dirname = os.path.abspath(os.path.join(__file__, "../../..")) + "/data"
        df_filepath = self.dirname + "/" + name + "/entire_df.csv"
        entire_df_filepath = self.dirname + "/" + name + "/entire_df.csv"
        graph_filepath = self.dirname + "/" + name + "/entire_graph.json"
        entire_graph_filepath = self.dirname + "/" + name + "/entire_graph.json"
        # if(graph_type != None):
        #     group_df_file_path = self.config.callflow_dir + '/' + name + '/' + graph_type + '_df.csv'
        #     group_graph_file_path = self.config.callflow_dir + '/' + name + '/' + graph_type + '_graph.json'
        parameters_filepath = (
            dataset_dirname + "/" + self.config.runName + "/" + name + "/env_params.txt"
        )

        state.df = pd.read_csv(df_filepath)
        # state.entire_df = pd.read_csv(entire_df_filepath)

        # with open(entire_graph_filepath, 'r') as entire_graphFile:
        #     entire_graph = json.load(entire_graphFile)
        # state.entire_g = json_graph.node_link_graph(entire_graph)

        with open(graph_filepath, "r") as filter_graphFile:
            graph = json.load(filter_graphFile)
        state.g = json_graph.node_link_graph(graph)

        # if(graph_type != None):
        #     with self.timer.phase('Read {0} dataframe'.format(graph_type)):
        #         with open(group_graph_file_path, 'r') as groupGraphFile:
        #             data = json.load(groupGraphFile)

        #     state.group_graph = json_graph.node_link_graph(data)
        #     state.group_df = pd.read_csv(group_df_file_path)
        # state.group_df = self.replace_str_with_Node(state.group_df, state.group_graph)

        if(self.config.runName.split('_')[0] == 'osu_bcast'):
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
                union_similarity = Similarity(
                    states[dataset2].g, states[dataset].g
                )
                ret[dataset].append(union_similarity.result)

        dirname = self.config.callflow_dir
        name = self.config.runName
        similarity_filepath = dirname  + '/' + 'similarity.json'
        with open(similarity_filepath, 'w') as json_file:
                json.dump(ret, json_file)