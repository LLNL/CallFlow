# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

"""
CallFlow's operation to split by callee.
"""
import callflow

LOGGER = callflow.get_logger(__name__)


class SplitCallee:
    """
    Split a callee if it is a module.
    """

    def __init__(self, gf, callsites):
        """

        :param gf:
        :param callsites:
        """
        assert isinstance(gf, callflow.GraphFrame)
        assert "component_path" in gf.df.columns

        paths = self.callsite_paths(callsites)

        # module_group_df = gf.df.groupby(["module"])
        module_name_group_df = gf.df.groupby(["module", "name"])

        for path in paths:
            component_edges = self.create_source_targets(path["component_path"])
            for idx, edge in enumerate(component_edges):
                module = edge["module"]

                # format module +  '=' + callsite
                source = edge["source"]
                target = edge["target"]

                if not gf.nxg.has_edge(source, target):
                    if idx == 0:
                        source_callsite = source
                        # source_df = module_group_df.get_group((module))
                        source_node_type = "super-node"
                    else:
                        source_callsite = source.split("=")[1]
                        # source_df = module_name_group_df.get_group((module, source_callsite))
                        source_node_type = "component-node"

                    target_callsite = target.split("=")[1]
                    target_df = module_name_group_df.get_group(
                        (module, target_callsite)
                    )
                    target_node_type = "component-node"

                    # source_weight = source_df["time (inc)"].max()
                    target_weight = target_df["time (inc)"].max()

                    edge_type = "normal"

                    LOGGER.info(f"Adding edge: {source_callsite}, {target_callsite}")
                    gf.nxg.add_node(source, attr_dict={"type": source_node_type})
                    gf.nxg.add_node(target, attr_dict={"type": target_node_type})
                    gf.nxg.add_edge(
                        source,
                        target,
                        attr_dict=[
                            {
                                "source_callsite": source_callsite,
                                "target_callsite": target_callsite,
                                "weight": target_weight,
                                "edge_type": edge_type,
                            }
                        ],
                    )

        return gf

    def create_source_targets(self, component_path):
        """

        :param component_path:
        :return:
        """
        module = ""
        edges = []
        for idx, callsite in enumerate(component_path):
            if idx == 0:
                module = component_path[0]
                edges.append(
                    {
                        "module": module,
                        "source": module,
                        "target": module + "=" + component_path[idx + 1],
                    }
                )
                pass
            elif idx == len(component_path) - 1:
                pass
            else:
                edges.append(
                    {
                        "module": module,
                        "source": module + "=" + component_path[idx],
                        "target": module + "=" + component_path[idx + 1],
                    }
                )

        return edges

    def callsite_paths(self, callsites):
        """

        :param callsites:
        :return:
        """
        from ast import literal_eval as make_list

        paths = []
        for callsite in callsites:
            df = self.name_group_df.get_group(callsite)
            paths.append(
                {
                    "group_path": make_list(df["group_path"].unique()[0]),
                    "path": make_list(df["path"].unique()[0]),
                    "component_path": make_list(df["component_path"].unique()[0]),
                }
            )
        return paths
