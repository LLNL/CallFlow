# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
"""
CallFlow's operation to split by entry function.
"""
import callflow


class SplitEntry:
    """
    Split by entry function
    """

    def __init__(self, gf, reveal_module):
        """

        :param gf:
        :param reveal_module:
        """
        assert isinstance(gf, callflow.GraphFrame)
        assert "group_path" in gf.df.columns

        entry_functions_map = self.module_entry_functions_map(gf.nxg)

        reveal_callsites = entry_functions_map[reveal_module]

        # TODO: Missing function.
        paths = self.callsitePathInformation(reveal_callsites)

        for path in paths:
            component_edges = self.create_source_targets(path["group_path"])

            # Decide what edges to remove from source and target nodes.
            source_edges_to_remove = self.same_source_edges(
                component_edges, reveal_module
            )
            target_edges_to_remove = self.same_target_edges(
                component_edges, reveal_module
            )

            if len(source_edges_to_remove) != 0:
                for edge in source_edges_to_remove:
                    if gf.nxg.has_edge(edge["source"], edge["target"]):
                        gf.nxg.remove_edge((edge["source"], edge["target"]))

                    # Add module=>source_callsite node.
                    gf.nxg.add_node(
                        reveal_module + "=" + edge["source_callsite"],
                        attr_dict={"type": "component-node"},
                    )

                    # Add corresponding edges.
                    self.gf.nxg.add_edge(
                        (reveal_module + "=" + edge["source_callsite"], edge["target"]),
                        attr_dict=[
                            {
                                "source_callsite": edge["source_callsite"],
                                "target_callsite": edge["target_callsite"],
                                "edge_type": "normal",
                                "weight": self.module_name_group_df.get_group(
                                    (reveal_module, edge["source_callsite"])
                                )["time (inc)"].max(),
                                # "edge_type": "reveal_edge",
                            }
                        ],
                    )

            # Remove edges that need not be shown.
            if len(target_edges_to_remove) != 0:
                for edge in target_edges_to_remove:
                    if gf.nxg.has_edge(edge["source"], edge["target"]):
                        gf.nxg.remove_edge(edge["source"], edge["target"])

                    gf.nxg.add_node(
                        reveal_module + "=" + edge["target_callsite"],
                        attr_dict={"type": "component-node"},
                    )

                    self.gf.nxg.add_edge(
                        edge["source"],
                        reveal_module + "=" + edge["target_callsite"],
                        attr_dict=[
                            {
                                "source_callsite": edge["source_callsite"],
                                "target_callsite": edge["target_callsite"],
                                "edge_type": "normal",
                                "weight": self.module_name_group_df.get_group(
                                    (edge["target"], edge["target_callsite"])
                                )["time (inc)"].max(),
                                # "edge_type": "reveal_edge",
                            }
                        ],
                    )

        # Remove the module node.
        self.gf.nxg.remove_node(reveal_module)

    # TODO: Need to make this a function of GraphFrame.
    def module_entry_functions_map(self, graph):
        """

        :param graph:
        :return:
        """
        entry_functions = {}
        for edge in graph.edges(data=True):
            attr_dict = edge[2]["attr_dict"]
            edge_tuple = (edge[0], edge[1])
            for edge_attr in attr_dict:
                if edge_tuple[1] not in entry_functions:
                    entry_functions[edge_tuple[1]] = []
                entry_functions[edge_tuple[1]].append(edge_attr["target_callsite"])
        return entry_functions

    def create_source_targets(self, path):
        """

        :param path:
        :return:
        """
        edges = []
        for idx, callsite in enumerate(path):
            if idx == len(path) - 1:
                break
            source = path[idx].split("=")
            target = path[idx + 1].split("=")
            edges.append(
                {
                    "source": source[0],
                    "target": target[0],
                    "source_callsite": source[1],
                    "target_callsite": target[1],
                }
            )
        return edges

    def same_source_edges(self, component_edges, reveal_module):
        """

        :param component_edges:
        :param reveal_module:
        :return:
        """
        ret = []
        for idx, edge in enumerate(component_edges):
            source = edge["source"]

            if source == reveal_module:
                ret.append(edge)
        return ret

    def same_target_edges(self, component_edges, reveal_module):
        """

        :param component_edges:
        :param reveal_module:
        :return:
        """
        ret = []
        for idx, edge in enumerate(component_edges):
            target = edge["target"]

            if target == reveal_module:
                ret.append(edge)
        return ret
