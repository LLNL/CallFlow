# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# Library imports
from flask import Flask
from flask_socketio import SocketIO, emit
import json
from networkx.readwrite import json_graph
import time

# ------------------------------------------------------------------------------
# CallFlow imports.
import callflow
from callflow.operations import ArgParser

LOGGER = callflow.get_logger(__name__)
_CALLFLOW_SERVER_PORT = 5000

# ------------------------------------------------------------------------------
# Create a Flask server.
app = Flask(__name__, static_url_path="/public")
sockets = SocketIO(app, cors_allowed_origins="*")


class CallFlowServer:
    """
    CallFlow Server class.
    """

    def __init__(self):
        self.args = ArgParser().get_arguments()

        self.debug = True
        self.production = False
        self.process = self.args["process"]

        ndatasets = len(self.args["properties"]["runs"])
        assert ndatasets > 0
        self.callflow = callflow.CallFlow(config=self.args, ensemble=ndatasets > 1)

        if self.process:
            self.callflow.process()
        else:
            self.callflow.load()

        # Create server if not processing.
        if not self.process:
            self._create_server()

    # ------------------------------------------------------------------------------

    def _create_server(self):
        """
        Create server's request handler and starts the server.
        Current version abstracts the requests into 3 categores:
        General: common requests for both ensemble and single.
        Single: requests for single dataset processing.
        Ensemble: requests for ensemble dataset processing.
        """

        # Socket request handlers
        self._request_handler_general()
        if len(self.args["properties"]["runs"]) == 1:
            self._request_handler_single()
        else:
            self._request_handler_single()
            self._request_handler_ensemble()

        info = manager.CallFlowLaunchInfo(
            version=__version__,
            start_time=int(time.time()),
            port=_CALLFLOW_SERVER_PORT,
            pid=os.getpid(),
            config_path=self.config.json,
            cache_key=self.cache_key,
        )

        manager.write_info_file(info)

        # Start the server.
        if self.production:
            sockets.run(
                app,
                host="0.0.0.0",
                debug=self.debug,
                use_reloader=True,
                port=_CALLFLOW_SERVER_PORT,
            )
        else:
            sockets.run(app, debug=False, use_reloader=True, port=_CALLFLOW_SERVER_PORT)

    def _request_handler_general(self):
        """
        General socket requests.
        """

        @sockets.on("reset", namespace="/")
        def reset(data):
            """
            # TODO: This might have to be deleted.
            """
            LOGGER.debug("[Socket request] reset: {}".format(data))
            dataset = data["dataset"]
            filterBy = data["filterBy"]
            filterPerc = data["filterPerc"]
            obj = {
                "name": "reset",
                "filterBy": filterBy,
                "filterPerc": filterPerc,
                "dataset1": dataset,
            }
            result = self.callflow.request(obj)
            emit("reset", result, json=True)

        @sockets.on("config", namespace="/")
        def config(data):
            result = self.callflow.request_single({"name": "init"})
            json_result = json.dumps(result)
            emit("config", json_result, json=True)

        @sockets.on("init", namespace="/")
        def init(data):
            """
            Essential data house for single callflow.
            :return: Config file (JSON Format).
            """
            LOGGER.debug(f"[Socket request] init: {data}")
            if data["mode"] == "Ensemble":
                result = self.callflow.request_ensemble({"name": "init"})
            elif data["mode"] == "Single":
                result = self.callflow.request_single({"name": "init"})
            json_result = json.dumps(result)
            emit("init", json_result, json=True)

        @sockets.on("ensemble_callsite_data", namespace="/")
        def ensemble_callsite_data(data):
            """
            Data house for ensemble callflow.
            :return: Auxiliary data.
            """
            LOGGER.debug("[Socket request] ensemble_callsite_data: {}".format(data))
            result = self.callflow.request_ensemble(
                {
                    "name": "auxiliary",
                    "datasets": data["datasets"],
                    "sortBy": data["sortBy"],
                    "MPIBinCount": data["MPIBinCount"],
                    "RunBinCount": data["RunBinCount"],
                    "module": data["module"],
                    "re-process": data["re_process"],
                }
            )
            emit("ensemble_callsite_data", result, json=True)

        @sockets.on("reveal_callsite", namespace="/")
        def reveal_callsite(data):
            """
            Reveal the callpaths of selected callsites.
            :return: networkx graph (JSON)
            """
            LOGGER.debug(f"[Socket request] reveal_callsite: {data}")
            nxg = self.callflow.request(
                {
                    "name": "supergraph",
                    "groupBy": "module",
                    "datasets": data["datasets"],
                    "reveal_callsites": data["reveal_callsites"],
                }
            )
            result = json_graph.node_link_data(nxg)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

        @sockets.on("split_by_entry_callsites", namespace="/")
        def split_by_entry_callsites(data):
            """
            Reveal the entry callsite of selected module.
            :return: networkx graph (JSON)
            """
            LOGGER.debug("Split by entry: {}".format(data))
            nxg = self.callflow.request(
                {
                    "name": "supergraph",
                    "groupBy": "module",
                    "datasets": data["datasets"],
                    "split_entry_module": data["selectedModule"],
                }
            )
            result = json_graph.node_link_data(nxg)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

        @sockets.on("split_by_callees", namespace="/")
        def split_by_callees(data):
            """
            Reveal the callees of selected module.
            :return: networkx graph (JSON)
            """
            LOGGER.debug("Split by callees: {}".format(data))
            nxg = self.callflow.request(
                {
                    "name": "supergraph",
                    "groupBy": "module",
                    "datasets": data["datasets"],
                    "split_by_callees": data["selectedModule"],
                }
            )
            result = json_graph.node_link_data(nxg)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

    def _request_handler_single(self):
        @sockets.on("single_callsite_data", namespace="/")
        def single_callsite_data(data):
            """
            Data house for single callflow.
            :return: Auxiliary data.
            """
            LOGGER.debug("[Socket request] single_callsite_data. {}".format(data))
            result = self.callflow.request_single(
                {
                    "name": "auxiliary",
                    "dataset": data["dataset"],
                    "sortBy": data["sortBy"],
                    "binCount": data["binCount"],
                    "module": data["module"],
                }
            )
            emit("single_callsite_data", result, json=True)

        @sockets.on("single_cct", namespace="/")
        def single_cct(data):
            """
            Single CCT.
            :return: CCT networkx graph (JSON format).
            """
            LOGGER.debug("[Socket request] Single CCT: {}".format(data))
            nxg = self.callflow.request_single(
                {
                    "name": "cct",
                    "dataset": data["dataset"],
                    "functionsInCCT": data["functionsInCCT"],
                }
            )
            result = json_graph.node_link_data(nxg)
            emit("single_cct", result, json=True)

        @sockets.on("single_supergraph", namespace="/")
        def single_supergraph(data):
            """
            Single SuperGraph.
            :return: both SuperGraph networkx graphs (JSON format).
            """
            LOGGER.debug("[Socket request] single_supergraph: {}".format(data))
            dataset = data["dataset"]
            groupBy = data["groupBy"].lower()
            nxg = self.callflow.request_single(
                {"name": "supergraph", "groupBy": groupBy, "dataset": dataset}
            )
            result = json_graph.node_link_data(nxg)
            json_result = json.dumps(result)
            emit("single_supergraph", json_result, json=True)

    def _request_handler_ensemble(self):
        @sockets.on("ensemble_cct", namespace="/")
        def ensemble_cct(data):
            """
            Union of all CCTs.
            :return: CCT networkx graph (JSON format).
            """
            LOGGER.debug("[Socket request] ensemble_cct: {}".format(data))
            nxg = self.callflow.request_ensemble(
                {
                    "name": "ensemble_cct",
                    "datasets": data["datasets"],
                    "functionsInCCT": data["functionsInCCT"],
                }
            )
            result = json_graph.node_link_data(nxg)
            # json_result = json.dumps(result)
            emit("ensemble_cct", result, json=True)

        @sockets.on("ensemble_supergraph", namespace="/")
        def ensemble_supergraph(data):
            """
            Ensemble SuperGraph.
            :return: both SuperGraph networkx graphs (JSON format).
            """
            LOGGER.debug("[Socket request] ensemble_supergraph: {}".format(data))
            datasets = data["datasets"]
            groupBy = data["groupBy"].lower()
            nxg = self.callflow.request_ensemble(
                {"name": "supergraph", "groupBy": groupBy, "datasets": datasets}
            )
            result = json_graph.node_link_data(nxg)
            json_result = json.dumps(result)
            emit("ensemble_supergraph", json_result, json=True)

        @sockets.on("ensemble_similarity", namespace="/")
        def ensemble_similarity(data):
            """
            Similarity Matrix for all callgraphs in ensemble.
            :return: Pair-wise similarity matrix
            """
            LOGGER.debug("ensemble_similarity: {data}")
            result = self.callflow.request(
                {
                    "name": "similarity",
                    "datasets": data["datasets"],
                    "algo": data["algo"],
                    "module": data["module"],
                }
            )
            emit("ensemble_similarity", result, json=True)

        @sockets.on("module_hierarchy", namespace="/")
        def module_hierarchy(data):
            """
            Module hierarchy of the supergraph.
            :return: CCT networkx graph (JSON format).
            """
            LOGGER.debug(f"module_hierarchy {data}")
            nxg = self.callflow.request_ensemble(
                {
                    "name": "hierarchy",
                    "datasets": data["datasets"],
                    "module": data["module"],
                }
            )
            result = json_graph.tree_data(nxg, root=data["module"])
            json_result = json.dumps(result)
            emit("module_hierarchy", json_result, json=True)

        @sockets.on("parameter_projection", namespace="/")
        def parameter_projection(data):
            """
            TODO: Verify the return type.
            Parameter projection of the datasets.
            :return: PCs. I guess.
            """
            LOGGER.debug(f"parameter_projection: {data}")
            result = self.callflow.request_ensemble(
                {
                    "name": "projection",
                    "datasets": data["datasets"],
                    "targetDataset": data["targetDataset"],
                    "numOfClusters": data["numOfClusters"],
                }
            )
            emit("parameter_projection", result, json=True)

        # Not used now. But lets keep it. Will be useful.
        @sockets.on("parameter_information", namespace="/")
        def parameter_information(data):
            """
            TODO: Verify the return type.
            Parameter information
            :return: { "parameter1": [Array], "parameter2": [Array] ...  }.
            """
            LOGGER.debug(f"[Socket request] parameter_information: {data}")
            result = self.callflow.request(
                {"name": "run-information", "datasets": data["datasets"]}
            )
            emit("parameter_information", json.dumps(result), json=True)

        @sockets.on("compare", namespace="/")
        def compare(data):
            """
            Compare two super-graphs.
            :return: Gradients in some JSON format.
            """
            LOGGER.debug("[Socket request] compare_supergraph {data}")
            result = self.callflow.request_ensemble(
                {
                    "name": "compare",
                    "targetDataset": data["targetDataset"],
                    "compareDataset": data["compareDataset"],
                    "selectedMetric": data["selectedMetric"],
                }
            )
            emit("compare", result, json=True)

        @sockets.on("split_mpi_distribution", namespace="/")
        def split_mpi_rank(data):
            """
            Split a single run based on MPI distribution
            """
            LOGGER.debug("[Socket request] compare_supergraph {data}")
            result = self.callflow.request_single(
                {
                    "name": "split_mpi_distribution",
                    "dataset": data["dataset"],
                    "ranks": data["ranks"],
                }
            )
            emit("split_mpi_distribution", result, json=True)


if __name__ == "__main__":
    # if verbose, level = 1
    # else, level = 2
    callflow.init_logger(level=2)
    CallFlowServer()
