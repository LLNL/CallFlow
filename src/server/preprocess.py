##############################################################################
# Copyright (c) 2018-2019, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
#
# This file is part of Callflowt.
# Created by Suraj Kesavan <kesavan1@llnl.gov>.
# LLNL-CODE-741008. All rights reserved.
#
# For details, see: https://github.com/LLNL/Callflow
# Please also read the LICENSE file for the MIT License notice.
##############################################################################
import random
from functools import wraps

import numpy as np
import utils
from logger import log
import bisect


def tmp_wrap(func):
	@wraps(func)
	def tmp(*args, **kwargs):
		log.info("Preprocessing : {0}".format(func.__name__))
		return func(*args, **kwargs)

	return tmp


# Preprocess the dataframe
# Builder object
# Preprocess.add_X().add_Y().....
class PreProcess:
	def __init__(self, builder):
		self.gf = builder.gf
		self.df = builder.df
		self.graph = builder.graph

	class Builder(object):
		def __init__(self, state, gf_type="entire"):
			self.state = state

			self.callers = {}
			self.callees = {}
			self.frames = {}
			self.paths = {}
			self.hatchet_nodes = {}

			if gf_type == "filter":
				self.gf = state.gf
				self.df = state.df
				self.graph = state.entire_graph
			elif gf_type == "entire":
				self.gf = state.entire_gf
				self.df = state.entire_df
				self.graph = state.entire_graph

			# Logger Information
			self.cct_nodes = []
			self.callgraph_nodes = []
			self.supergraph_nodes = []
			self.unmapped_targets = []

			self.callgraph_nodes_np = np.array([])
			self.cct_nodes_np = np.array([])

			# self.dfMapper()
			self.graphMapper()

			self.map = {}

		def dfMapper(self):
			ret = {}
			for idx, row in self.df.iterrows():
				node_df = self.state.lookup_with_node(row.node)
				n_index = node_df["n_index"].tolist()
				p_incTime = node_df[attr].tolist()
				for idx in range(len(n_index)):
					if n_index[idx] not in ret:
						ret[n_index[idx]] = []
					ret[n_index[idx]].append(p_incTime[idx])
			return ret

		#################### Mapper functions ###############
		def update_unmapped_target_nodes(self, source, target):
			if source in self.unmapped_targets:
				self.unmapped_targets.remove(source)
			elif target not in set(self.unmapped_targets):
				self.unmapped_targets.append(target)

		def graphMapper(self):
			graph = self.graph

			for root in graph.roots:
				node_gen = root.traverse()

				root_dict = utils.getNodeDictFromFrame(root.frame)
				root_name = root_dict["name"]
				root_paths = root.paths()

				self.callers[root_name] = []
				self.callees[root_name] = []
				self.paths[root_name] = [root_paths]
				self.hatchet_nodes[root_name] = [root]

				node = root

				try:
					while node:
						node_dict = utils.getNodeDictFromFrame(node.frame)
						node_name = node_dict["name"]

						# Append all the unique paths belonging to a callsite.
						node_paths = node.paths()
						self.paths[node_name] = node_paths

						# Append the frames to the map.
						if node_name not in self.frames:
							self.frames[node_name] = []
						self.frames[node_name].append(node.frame)

						# Append the Hatchet node to the map.
						if node_name not in self.hatchet_nodes:
							self.hatchet_nodes[node_name] = []
						self.hatchet_nodes[node_name].append(node)

						# Append the callers and callees.
						for node_path in node_paths:
							if len(node_path) >= 2:

								source_node_dict = utils.getNodeDictFromFrame(
									node_path[-2]
								)
								target_node_dict = utils.getNodeDictFromFrame(
									node_path[-1]
								)

								source_node_name = source_node_dict["name"]
								target_node_name = target_node_dict["name"]

								# Add the callers.
								if source_node_name not in self.callers:
									self.callers[source_node_name] = []
								self.callers[source_node_name].append(target_node_name)

								# Add the callees.
								if target_node_name not in self.callees:
									self.callees[target_node_name] = []
								self.callees[target_node_name].append(source_node_name)

								self.update_unmapped_target_nodes(source_node_name, target_node_name)
							# For logger.
						self.cct_nodes.append(node_name)
						node = next(node_gen)

					# All logging information is converted to numpy to improve calculation speeds.

				except StopIteration:
					pass
				finally:
					node_dict = utils.getNodeDictFromFrame(node.frame)
					node_name = node_dict["name"] + ":" + str(node_dict["line"])
					node_paths = node.paths()
					self.paths[node_name] = node_paths

					# Append the frames to the map.
					if node_name not in self.frames:
						self.frames[node_name] = []
					self.frames[node_name].append(node.frame)

					# Append the Hatchet node to the map.
					if node_name not in self.hatchet_nodes:
						self.hatchet_nodes[node_name] = []
					self.hatchet_nodes[node_name].append(node)

					self.callers[node_name] = node_paths[0][-2]
					self.callees[node_name] = None

					self.cct_nodes.append(node_name)

					self.callgraph_nodes = np.unique(np.array(self.cct_nodes))

					for node_name in self.unmapped_targets:
						self.callers[node_name] = []
					del root

		def build(self):
			return PreProcess(self)

		@tmp_wrap
		def add_hatchet_node(self):
			self.raiseExceptionIfNodeCountNotEqual(self.hatchet_nodes.keys())
			self.df["hatchet_node"] = self.df["name"].apply(
				lambda node_name: self.hatchet_nodes[node_name]
			)
			return self

		# Add the path information from the node object
		@tmp_wrap
		def add_path(self):
			self.raiseExceptionIfNodeCountNotEqual(self.paths)
			self.df["path"] = self.df["name"].apply(
				lambda node_name: utils.getPathListFromFrames(self.paths[node_name])
			)
			return self

		@tmp_wrap
		def add_incTime(self):
			self.map["time (inc)"] = self._map("time (inc)")
			return self

		@tmp_wrap
		def add_excTime(self):
			self.map["time"] = self._map("time")
			return self

		# Max of the inclusive Runtimes among all processes
		# node -> max([ inclusive times of process])
		@tmp_wrap
		def add_max_incTime(self):
			ret = {}

			for idx, row in self.df.iterrows():
				ret[str(row.nid)] = max(self.state.lookup(row.nid)["time (inc)"])

			self.map["max_incTime"] = ret
			self.df["max_incTime"] = self.df["node"].apply(
				lambda node: self.map["max_incTime"][str(node.nid)]
			)
			return self

		# Avg of inclusive Runtimes among all processes
		# node -> avg([ inclusive times of process])
		@tmp_wrap
		def add_avg_incTime(self):
			ret = {}
			for idx, row in self.df.iterrows():
				ret[str(row.nid)] = utils.avg(self.state.lookup(row.nid)["time (inc)"])

			self.map["avg_incTime"] = ret
			self.df["avg_incTime"] = self.df["node"].apply(
				lambda node: self.map["avg_incTime"][str(node.nid)]
			)

			return self

		# Imbalance percentage Series in the dataframe
		@tmp_wrap
		def add_imbalance_perc(self):
			ret = {}
			for idx, row in self.df.iterrows():
				max_incTime = self.map["max_incTime"][str(row.nid)]
				if max_incTime == 0.0:
					max_incTime = 1.0
				ret[str(row.nid)] = (
					self.map["max_incTime"][str(row.nid)]
					- self.map["avg_incTime"][str(row.nid)]
				) / max_incTime

			self.map["imbalance_perc"] = ret
			self.df["imbalance_perc"] = self.df["node"].apply(
				lambda node: self.map["imbalance_perc"][str(node.nid)]
			)
			return self

		@tmp_wrap
		def add_callers_and_callees(self):
			self.df["callees"] = self.df["name"].apply(lambda node: self.callees[node] if node in self.callees else [])
			self.df["callers"] = self.df["name"].apply(lambda node: self.callers[node] if node in self.callers else [])

			return self

		@tmp_wrap
		def add_show_node(self):
			self.map["show_node"] = {}
			self.df["show_node"] = self.df["name"].apply(lambda node: True)
			return self

		@tmp_wrap
		def update_show_node(self, show_node_map):
			self.map.show_node = show_node_map
			self.df["show_node"] = self.df["node"].apply(
				lambda node: show_node_map[str(node.df_index)]
			)
			return self

		# node_name is different from name in dataframe. So creating a copy of it.
		@tmp_wrap
		def add_vis_node_name(self):
			self.df["vis_node_name"] = self.df["name"].apply(lambda name: name)
			return self

		@tmp_wrap
		def add_node_name_hpctoolkit(self, node_name_map):
			self.df["node_name"] = self.df["name"].apply(
				lambda name: node_name_map[name]
			)
			return self

		@tmp_wrap
		def add_module_name_hpctoolkit(self):
			self.df["module"] = self.df["module"].apply(
				lambda name: utils.sanitizeName(name)
			)
			return self

		@tmp_wrap
		def add_node_name_caliper(self, node_module_map):
			self.df['node_name'] = self.df['name'].apply(lambda name: name_module_map[name])

		@tmp_wrap
		def add_module_name_caliper(self, module_map):
			self.df['module'] = self.df['name'].apply(lambda name: module_map[name])
			return self


		@tmp_wrap
		def add_n_index(self):
			self.df["n_index"] = self.df.groupby("nid").ngroup()
			return self

		@tmp_wrap
		def add_mod_index(self):
			self.df["mod_index"] = self.df.groupby("module").ngroup()
			return self

		@tmp_wrap
		def add_dataset_name(self):
			self.df["dataset"] = self.state.name
			return self

		def raiseExceptionIfNodeCountNotEqual(self, attr):
			map_node_count = len(attr)
			callgraph_node_count = self.callgraph_nodes.shape[0]
			if map_node_count != callgraph_node_count:
				raise Exception(
					f"Unmatched Preprocessing maps: Map contains: {map_node_count} nodes, graph contains: {callgraph_node_count} nodes"
				)

		@tmp_wrap
		def logInformation(self):
			log.info(f"CCT node count : {len(self.cct_nodes)}")
			log.info(f"CallGraph node count: {len(self.callgraph_nodes)}")
			log.info(f"SuperGraph node count: {len(self.df['module'].unique())}")
			return self

