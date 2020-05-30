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
import json
import os


class ConfigFileReader:
    def __init__(self, filepath=None, config_json=None):
        if filepath:
            dirname = os.path.dirname(__file__)
            print(__file__, dirname, filepath)
            filename = os.path.join(dirname, filepath)
            f = open(filename, "r").read()
            self.json = self.json_data(f)

        if config_json:
            self.json = config_json

        self.datasets = self.json["datasets"]
        self.runName = self.json["run_name"]
        self.callflow_path = os.path.abspath(os.path.join(__file__, "../../.."))
        self.save_path = os.path.join(self.callflow_path, self.json["save_path"])
        self.scheme = self.json["scheme"]

        self.run()

    def process_module_map(self):
        ret = {}
        for module in self.module_callsite_map:
            callsites = self.module_callsite_map[module]
            for callsite in callsites:
                ret[callsite] = module
        return ret

    def run(self):
        self.paths = {}
        self.module_paths = {}
        self.format = {}
        self.names = []
        self.dataset_names = []

        # Parse scheme.
        self.filter_perc = self.scheme["filter_perc"]
        self.filter_by = self.scheme["filter_by"]
        self.group_by = self.scheme["group_by"]

        # Module map is only needed for caliper format.
        # For HPCToolkit, we have a module field from the data.
        if "module_map" in self.scheme:
            self.module_callsite_map = self.scheme["module_map"]
            self.callsite_module_map = self.process_module_map()
        else:
            self.callsite_module_map = {}

        # Parse the information for each dataset
        for idx, data in enumerate(self.datasets):
            name = data["name"]
            self.names.append(name)
            self.dataset_names.append(name)
            self.paths[name] = data["path"]
            self.format[name] = data["format"]

    def json_data(self, json_text):
        return self._byteify(
            json.loads(json_text, object_hook=self._byteify), ignore_dicts=True
        )

    def _byteify(self, data, ignore_dicts=False):
        # if this is a unicode string, return its string representation
        if isinstance(data, bytes):
            return data.encode("utf-8")
        # if this is a list of values, return list of byteified values
        if isinstance(data, list):
            return [self._byteify(item, ignore_dicts=True) for item in data]
        # if this is a dictionary, return dictionary of byteified keys and values
        # but only if we haven't already byteified it
        if isinstance(data, dict) and not ignore_dicts:
            return {
                self._byteify(key, ignore_dicts=True): self._byteify(
                    value, ignore_dicts=True
                )
                for key, value in data.items()
            }
        # if it's anything else, return it in its original form
        return data

    def __repr__(self):
        items = ("%s = %r" % (k, v) for k, v in self.__dict__.items())
        return "<%s: {%s}> \n" % (self.__class__.__name__, ", ".join(items))

    def __str__(self):
        items = ("%s = %r" % (k, v) for k, v in self.__dict__.items())
        return "<%s: {%s}> \n" % (self.__class__.__name__, ", ".join(items))