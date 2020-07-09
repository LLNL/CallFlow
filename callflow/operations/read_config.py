# *******************************************************************************
# * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
# * Produced at the Lawrence Livermore National Laboratory.
# *
# * Written by Suraj Kesavan <htpnguyen@ucdavis.edu>.
# *
# * LLNL-CODE-740862. All rights reserved.
# *
# * This file is part of CallFlow. For details, see:
# * https://github.com/LLNL/CallFlow
# * Please also read the LICENSE file for the MIT License notice.
# ******************************************************************************
# Library imports
import os
import json


class ConfigFileReader:

    # --------------------------------------------------------------------------
    # TODO: lots of redundancy in this class.
    def __init__(self, filepath=None, config_json=None):

        # only one should be given
        assert (filepath == None) != (config_json == None)

        if filepath != None:
            assert isinstance(filepath, str)

            f = open(filepath, "r").read()
            self.json = ConfigFileReader.json_data(f)
            self.data_path = os.path.dirname(filepath)

        if config_json != None:
            assert isinstance(config_json, dict)

            self.json = config_json
            self.data_path = os.getcwd()

        self.scheme = self.json["scheme"]
        self.datasets = self.json["datasets"]
        self.runName = self.json["run_name"]
        self.save_path = os.path.join(self.data_path, ".callflow")
        self.read_parameter = self.json["read_parameter"]

        self.run()

    # --------------------------------------------------------------------------
    def run(self):
        self.paths = {}
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
            self.callsite_module_map = self._process_module_map()
        else:
            self.callsite_module_map = {}

        # Parse the information for each dataset
        for idx, data in enumerate(self.datasets):
            name = data["name"]
            self.names.append(name)
            self.dataset_names.append(name)
            self.paths[name] = data["path"]
            self.format[name] = data["format"]

    # --------------------------------------------------------------------------
    def _process_module_map(self):
        ret = {}
        for module in self.module_callsite_map:
            callsites = self.module_callsite_map[module]
            for callsite in callsites:
                ret[callsite] = module
        return ret

    # --------------------------------------------------------------------------
    # TODO: this should be moved to utils?
    @staticmethod
    def json_data(json_text):
        _ = json.loads(json_text, object_hook=ConfigFileReader._byteify)
        return ConfigFileReader._byteify(_, ignore_dicts=True)

    # TODO: this should be moved to utils?
    @staticmethod
    def _byteify(data, ignore_dicts=False):

        # if this is a unicode string, return its string representation
        if isinstance(data, bytes):
            return data.encode("utf-8")

        # if this is a list of values, return list of byteified values
        if isinstance(data, list):
            return [ConfigFileReader._byteify(item, ignore_dicts=True) for item in data]

        # if this is a dictionary, return dictionary of byteified keys and values
        # but only if we haven't already byteified it
        if isinstance(data, dict) and not ignore_dicts:
            return {
                ConfigFileReader._byteify(
                    key, ignore_dicts=True
                ): ConfigFileReader._byteify(value, ignore_dicts=True)
                for key, value in data.items()
            }
        # if it's anything else, return it in its original form
        return data

    # --------------------------------------------------------------------------
    def __str__(self):
        items = ("%s = %r" % (k, v) for k, v in self.__dict__.items())
        return "<%s: {%s}> \n" % (self.__class__.__name__, ", ".join(items))

    def __repr__(self):
        return self.__str__()

    # --------------------------------------------------------------------------
