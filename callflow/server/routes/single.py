from utils.logger import log

class SingleModeRouter():
    def __init__(self):
        pass

    @sockets.on("group", namespace="/")
        def group(data):
            if self.debug:
                self.print("[Request] Group the dataset.", data)
            dataset = data["dataset"]
            graphFormat = data["format"]
            groupBy = data["groupBy"].lower()
            print("[Group] Dataset: {0}, format: {1}".format(dataset, graphFormat))
            obj = {"name": "group", "groupBy": groupBy, "dataset": dataset}
            g = self.callflow.update(obj)
            result = json_graph.node_link_data(g)
            emit("group", result, json=True)

        @sockets.on("hierarchy", namespace="/")
        def module_hierarchy(data):
            if self.debug:
                print("[Request] Module hierarchy of the dataset.", data)
            nid = data["nid"]
            dataset = data["dataset"]
            result = self.callflow.update(
                {"name": "hierarchy", "nid": nid, "dataset": dataset,}
            )
            emit("hierarchy", result, json=True)

        @sockets.on("uncertainity", namespace="/")
        def uncertainity(data):
            if self.debug:
                self.print("[Request] Uncertainity of the dataset.")
            result = {}
            emit("uncertainity", result, json=True)

        @sockets.on("histogram", namespace="/")
        def histogram(data):
            if self.debug:
                self.print("[Request] Histogram of a Module", data["nid"])
            dataset = data["dataset"]
            result = self.callflow.update(
                {
                    "name": "histogram",
                    "dataset": dataset,
                    "module": data["module"],
                    "nid": data["nid"],
                }
            )
            emit("histogram", result, json=True)

        @sockets.on("scatterplot", namespace="/")
        def scatterplot(data):
            if self.debug:
                self.print("[Request] ScatterPlot of a Module", data["module"])
            dataset = data["dataset"]
            result = self.callflow.update(
                {
                    "name": "histogram",
                    "dataset": dataset,
                    "module": data["module"],
                    "nid": data["nid"],
                }
            )
            emit("scatterplot", result, json=True)

        @sockets.on("miniHistogram", namespace="/")
        def histogram(data):
            if self.debug:
                self.print("[Request] Mini-histogram", data)
            dataset = data["dataset"]
            result = self.callflow.update(
                {"name": "mini-histogram", "dataset": dataset,}
            )
            emit("miniHistogram", result, json=True)

        @sockets.on("function", namespace="/")
        def function(data):
            if self.debug:
                self.print("[Request] Function request for module", data)

            result = self.callflow.update(
                {
                    "name": "function",
                    "dataset": data["dataset"],
                    "module": data["module"],
                    "nid": data["nid"],
                }
            )
            emit("function", result, json=True)


