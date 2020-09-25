# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import os
import jsonschema
import argparse
import shlex

import callflow

LOGGER = callflow.get_logger(__name__)

schema = {
    "type": "object",
    "properties": {
        "data_path": {"type": "string"},
        "experiment": {"type": "string"},
        "save_path": {"type": "string"},
        "read_parameter": {"type": "boolean"},
        "properties": {"type": "object"},
    },
}

_SUPPORTED_PROFILE_FORMATS = ["hpctoolkit", "caliper_json", "caliper"]


class ArgParser:
    """
    Read the config file.
    Config file contains the information to process datasets accrodingly.
    """

    def __init__(self, args_string=[]):

        _READ_MODES = {
            "config": ArgParser._read_config,
            "directory": ArgParser._read_directory,
            "gfs": ArgParser._read_gfs,
        }

        # Parse the arguments passed.
        args = self._create_parser(args_string)

        # Verify if only valid things are passed.
        # Read mode determines how arguments will be consumed by CallFlow.
        read_mode = self._verify_parser(args)
        LOGGER.debug(f"Read mode: {read_mode}")

        # Check if read mode is one of the keys of _READ_MODES.
        assert read_mode in _READ_MODES.keys()

        self.config = _READ_MODES[read_mode](args)

        # Add read_mode to arguments.
        self.read_mode = read_mode

        # Add process to arguments
        self.process = args.process

        # validate the json.
        jsonschema.validate(instance=self.config, schema=schema)

        LOGGER.debug(f"CallFlow instantiation configuration: {self.config}")

    def get_arguments(self):
        return self.arguments

    # Private methods.
    @staticmethod
    def _create_parser(args_string):
        """
        Parse the input arguments.
        """
        parser = argparse.ArgumentParser(prefix_chars="--")
        parser.add_argument(
            "--verbose", action="store_true", help="Display debug points"
        )
        parser.add_argument("--config", help="Config file to be processed.")
        parser.add_argument("--data_dir", help="Input directory to be processed.")
        parser.add_argument(
            "--process",
            action="store_true",
            help="Process mode. To preprocess at the required level of granularity, use the options --filter, --entire.",
        )
        parser.add_argument(
            "--profile_format",
            help="Profile format, either hpctoolkit | caliper | caliper_json",
        )
        parser.add_argument("--production", help="Launch app on production server.")
        parser.add_argument("--filter_perc", help="Set filter percentage")
        parser.add_argument(
            "--filter_by", help="Set filter by (e.g., time or time (inc)"
        )
        parser.add_argument(
            "--group_by",
            help="Set group by (e.g., grouping by 'name' column gets call graph, and grouping by 'module' produces a super graph",
        )
        parser.add_argument("--save_path", help="Save path for the processed files")
        parser.add_argument(
            "--read_parameter", help="Enable parameter analysis", action="store_true"
        )
        parser.add_argument("--gfs", help="Enter graphframes")

        if args_string:
            return parser.parse_args(shlex.split(args_string))
        else:
            return parser.parse_args()

    @staticmethod
    def _verify_parser(args: argparse.Namespace):
        """
        Verify the input arguments.

        Raises expections if something is not provided
        Check if the config file is provided and exists!

        Parameters
        ----------
        args : argparse.Namespace
            Arguments passed by the user.

        Returns
        -------
        process_mode: 'config' or 'directory' or 'gfs'
            Process mode with which CallFlow will process the data.
        """
        if not args.config and not args.data_dir and not args.gfs:
            s = "Please provide a config file (or) directory (or) pass in the graphframes. To see options, use --help"
            raise Exception(s)

        if args.config:
            read_mode = "config"
            if not os.path.isfile(args.config):
                s = "Config file ({}) not found!".format(args.config)
                raise Exception(s)

        elif args.data_dir:
            read_mode = "directory"

        elif args.gfs:
            read_mode = "graphframes"

        return read_mode

    @staticmethod
    def _read_config(args: argparse.Namespace):
        scheme = {}
        f = open(args.config, "r").read()
        json = callflow.utils.jsonify_string(f)

        # Validate the input json.
        jsonschema.validate(instance=json, schema=schema)

        # Set the data_path, which is data directory.
        scheme["data_path"] = os.path.dirname(args.config)

        # Set the run_name.
        if "experiment" not in json:
            scheme["experiment"] = scheme["data_path"].split("/")[-1]
        else:
            scheme["experiment"] = json["experiment"]

        # Set the save_path, if provided, else it will be ${data_path}/.callflow
        if "save_path" not in json:
            scheme["save_path"] = os.path.abspath(
                os.path.join(scheme["data_path"], ".callflow")
            )
        else:
            scheme["save_path"] = os.path.abspath(json["save_path"])

        # Set the read_parameter if provided
        if "read_parameter" not in json:
            scheme["read_parameter"] = False
        else:
            scheme["read_parameter"] = json["read_parameter"]

        # Set the datasets key, according to the format.
        _SCHEME_PROFILE_FORMAT_MAPPER = {
            "hpctoolkit": ArgParser._scheme_dataset_map_hpctoolkit,
            "caliper": ArgParser._scheme_dataset_map_caliper,
            "caliper_json": ArgParser._scheme_dataset_map_caliper_json,
            "default": ArgParser._scheme_dataset_map_default,
        }

        LOGGER.debug("Scheme: default")
        if "runs" not in json and "profile_format" not in json:
            raise Exception(
                "Either 'runs' or 'profile_format' key must be provided in the config file."
            )
        elif "runs" in json and "profile_format" not in json:
            scheme["properties"] = _SCHEME_PROFILE_FORMAT_MAPPER["default"](
                json["runs"]
            )
        elif "runs" not in json and "profile_format" in json:
            assert json["profile_format"] in _SUPPORTED_PROFILE_FORMATS
            scheme["properties"] = _SCHEME_PROFILE_FORMAT_MAPPER[
                json["profile_format"]
            ](json["runs"])

        if "module_map" in json["scheme"]:
            scheme["module_callsite_map"] = json["scheme"]["module_map"]

        scheme["callsite_module_map"] = ArgParser._process_module_map(
            scheme["module_callsite_map"]
        )

        if args.filter_by:
            scheme["filter_by"] = args.filter_by
        else:
            scheme["filter_by"] = json["scheme"]["filter_by"]

        if args.filter_perc:
            scheme["filter_perc"] = args.filter_perc
        else:
            scheme["filter_perc"] = json["scheme"]["filter_perc"]

        if args.group_by:
            scheme["group_by"] = args.group_by
        else:
            scheme["group_by"] = json["scheme"]["group_by"]
        return scheme

    @staticmethod
    def _scheme_dataset_map_default(run_props: dict):
        """
        Derive the scheme for dataset_map, if dataset_map is provided through the config file.
        """
        scheme = {}
        scheme["runs"] = []
        scheme["paths"] = {}
        scheme["profile_format"] = {}
        # Parse the information for each dataset
        for idx, data in enumerate(run_props):
            name = data["name"]
            scheme["runs"].append(name)
            scheme["paths"][name] = data["path"]

            # Assert if the profile_format is provided.
            if "profile_format" not in data:
                raise Exception(f"Profile format not specified for the dataset: {name}")

            assert data["profile_format"] in _SUPPORTED_PROFILE_FORMATS

            scheme["profile_format"][name] = data["profile_format"]
        return scheme

    @staticmethod
    def _scheme_dataset_map_hpctoolkit(data_path: str):
        """
        Derive the scheme for dataset_map for hpctoolkit format.
        """
        scheme = {}
        scheme["runs"] = []
        scheme["paths"] = {}
        scheme["profile_format"] = {}
        list_subfolders_with_paths = [
            f.path for f in os.scandir(data_path) if f.is_dir()
        ]

        for idx, subfolder_path in enumerate(list_subfolders_with_paths):
            name = subfolder_path.split("/")[-1]
            if name != ".callflow":
                scheme["runs"].append(name)
                scheme["paths"][name] = subfolder_path
                scheme["profile_format"][name] = "hpctoolkit"

        return scheme

    @staticmethod
    def _scheme_dataset_map_caliper(data_path: str):
        """
        Derive the scheme for dataset_map for caliper format.
        """
        scheme = {}
        scheme["runs"] = []
        scheme["paths"] = {}
        scheme["profile_format"] = {}
        list_cali_paths = [
            f.path
            for f in os.scandir(data_path)
            if os.path.splitext(f.path)[1] == ".cali"
        ]

        for idx, subfolder_path in enumerate(list_cali_paths):
            name = subfolder_path.split("/")[-1].split(".")[0]
            if name != ".callflow":
                scheme["runs"].append(name)
                scheme["paths"][name] = subfolder_path
                scheme["profile_format"][name] = "caliper"

        return scheme

    @staticmethod
    def _scheme_dataset_map_caliper_json(data_path: str):
        """
        Derive the scheme for dataset_map for caliper json format.
        """
        scheme = {}
        scheme["runs"] = []
        scheme["paths"] = {}
        scheme["profile_format"] = {}
        list_json_paths = [
            f.path
            for f in os.scandir(data_path)
            if os.path.splitext(f.path)[1] == ".json"
        ]

        for idx, subfolder_path in enumerate(list_json_paths):
            name = subfolder_path.split("/")[-1]
            if name != "callflow.config.json":
                filename = name.split(".")[0]
                scheme["runs"].append(filename)
                scheme["paths"][filename] = subfolder_path
                scheme["profile_format"][filename] = "caliper_json"

        return scheme

    @staticmethod
    def _read_directory(args):
        scheme = {}

        # Set data path
        scheme["data_path"] = args.data_dir

        # Set experiement
        scheme["experiment"] = scheme["data_path"].split("/")[-1]

        # Set save_path
        if args.save_path:
            scheme["save_path"] = args.save_path
        else:
            scheme["save_path"] = os.path.abspath(
                os.path.join(scheme["data_path"], ".callflow")
            )

        scheme["read_parameter"] = args.read_parameter

        # Set the datasets key, according to the format.
        _SCHEME_PROFILE_FORMAT_MAPPER = {
            "hpctoolkit": ArgParser._scheme_dataset_map_hpctoolkit,
            "caliper": ArgParser._scheme_dataset_map_caliper,
            "caliper_json": ArgParser._scheme_dataset_map_caliper_json,
            "default": ArgParser._scheme_dataset_map_default,
        }
        scheme["properties"] = []
        if "profile_format" in args:
            profile_format = args.profile_format

            LOGGER.debug(f"Scheme: {profile_format}")

            scheme["properties"] = _SCHEME_PROFILE_FORMAT_MAPPER[profile_format](
                scheme["data_path"]
            )
        else:
            scheme["properties"] = _SCHEME_PROFILE_FORMAT_MAPPER["default"](
                scheme["data_path"]
            )

        # Set filter_perc
        if args.filter_perc:
            scheme["filter_perc"] = args.filter_perc
        else:
            scheme["filter_perc"] = 0

        # Set filter_by
        if args.filter_by:
            scheme["filter_by"] = args.filter_by
        else:
            scheme["filter_by"] = "time (inc)"

        # Set group_by
        if args.group_by:
            scheme["group_by"] = args.group_by
        else:
            scheme["group_by"] = "module"

        return scheme

    @staticmethod
    def _read_gfs(self, args):
        pass

    @staticmethod
    def _process_module_map(module_callsite_map):
        """
        Process module mapper file.
        """
        ret = {}
        for module in module_callsite_map:
            callsites = module_callsite_map[module]
            for callsite in callsites:
                ret[callsite] = module
        return ret

    # --------------------------------------------------------------------------
    def __str__(self):
        items = ("%s = %r" % (k, v) for k, v in self.__dict__.items())
        return "<%s: {%s}> \n" % (self.__class__.__name__, ", ".join(items))

    def __repr__(self):
        return self.__str__()

    # --------------------------------------------------------------------------
