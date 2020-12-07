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

SCHEMA = {
    "type": "object",
    "properties": {
        "data_path": {"type": "string"},
        "experiment": {"type": "string"},
        "save_path": {"type": "string"},
        "read_parameter": {"type": "boolean"},
        "runs": {"type": "array"},
        "filter_perc": {"type": "number"},
        "filter_by": {"type": "string"},
        "group_by": {"type": "string"},
    },
}

_SUPPORTED_PROFILE_FORMATS = ["hpctoolkit", "caliper_json", "caliper"]


class ArgParser:
    """
    Argparser class decodes the arguments passed to the execution of CallFlow.
    Current implementation supports three modes:
        1) data_dir
        2) config
        3) graphframe (TODO: CAL-8: Add graphframe processing for Jupyter notebooks)

    The class performs the following actions:
    1. Parse the command line arguments.
    2. Verify if the required parameters are provided.
    3. Generate the config object containing the dataset information.
    4. Create a .callflow directory if not present in the provided save_path.
    5. Dump the config file.
    6. Validate the generated or passed config object.
    """

    def __init__(self, args_string=[]):

        _READ_MODES = {
            "config": ArgParser._read_config,
            "directory": ArgParser._read_directory,
            "gfs": ArgParser._read_gfs,
        }

        # Parse the arguments passed.
        args = ArgParser._create_parser(args_string)

        # Verify if only valid things are passed.
        # Read mode determines how arguments will be consumed by CallFlow.
        read_mode = ArgParser._verify_parser(args)
        LOGGER.debug(f"Read mode: {read_mode}")

        # Check if read mode is one of the keys of _READ_MODES.
        assert read_mode in _READ_MODES.keys()

        # Call the appropriate function belonging to the format.
        self.config = _READ_MODES[read_mode](args)

        # Add read_mode to arguments.
        self.read_mode = read_mode

        # Add process to arguments.
        self.process = args.process

        ArgParser._create_dot_callflow_folder(self.config)

        if self.read_mode != "config":
            # Write the config file.
            ArgParser._write_config(self.config)

        # validate the config variable by checking with the schema.
        jsonschema.validate(instance=self.config, schema=SCHEMA)

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
            if not args.profile_format:
                s = "Provide format using --profile_format"
                raise Exception(s)

        elif args.gfs:
            read_mode = "graphframes"
            # TODO: CAL-8: Add graphframe processing for Jupyter notebooks

        return read_mode

    @staticmethod
    def _read_config(args: argparse.Namespace):
        """
        Config file read mode.
        This function would overwrite all the automatic config with the user-provided config.
        """
        scheme = {}
        f = open(args.config, "r").read()
        json = callflow.utils.jsonify_string(f)

        # Validate the input json.
        jsonschema.validate(instance=json, schema=SCHEMA)

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

        if "runs" not in json and "profile_format" not in json:
            raise Exception(
                "Either 'runs' or 'profile_format' key must be provided in the config file."
            )
        elif "runs" in json and "profile_format" not in json:
            scheme["runs"] = _SCHEME_PROFILE_FORMAT_MAPPER["default"](json["runs"])
        elif "runs" not in json and "profile_format" in json:
            assert json["profile_format"] in _SUPPORTED_PROFILE_FORMATS
            scheme["runs"] = _SCHEME_PROFILE_FORMAT_MAPPER[json["profile_format"]](
                json["runs"]
            )

        if args.filter_by:
            scheme["filter_by"] = args.filter_by
        else:
            scheme["filter_by"] = json["filter_by"]

        if args.filter_perc:
            scheme["filter_perc"] = args.filter_perc
        else:
            scheme["filter_perc"] = json["filter_perc"]

        if args.group_by:
            scheme["group_by"] = args.group_by
        else:
            scheme["group_by"] = json["group_by"]

        if "callsite_module_map" in json:
            scheme["callsite_module_map"] = ArgParser._process_module_map(
                json["scheme"]["callsite_module_map"]
            )

        if "callsite_module_map" in json["scheme"]:
            scheme["callsite_module_map"] = ArgParser._process_module_map(
                json["scheme"]["callsite_module_map"]
            )

        return scheme

    @staticmethod
    def _write_config(config):
        """
        Dump the config file into .callflow directory.
        """
        import json

        file_path = os.path.join(config["save_path"], "config.json")
        LOGGER.info("config.json dumped into {}".format(file_path))
        with open(file_path, "w+") as fp:
            json_string = json.dumps(
                config, default=lambda o: o.__dict__, sort_keys=True, indent=2
            )
            fp.write(json_string)

    @staticmethod
    def _scheme_dataset_map_default(run_props: dict):
        """
        Derive the scheme for dataset_map, if dataset_map is provided through the config file.
        """
        runs = []
        # Parse the information for each dataset
        for idx, data in enumerate(run_props):
            run = {
                "name": data["name"],
                "path": data["path"],
                "profile_format": data["profile_format"],
            }

            runs.append(run)
        return runs

    @staticmethod
    def _scheme_dataset_map_hpctoolkit(data_path: str):
        """
        Derive the scheme for dataset_map for hpctoolkit format.
        """
        runs = []
        list_subfolders_with_paths = [
            f.path for f in os.scandir(data_path) if f.is_dir()
        ]

        for idx, subfolder_path in enumerate(list_subfolders_with_paths):
            name = subfolder_path.split("/")[-1]
            if name != ".callflow":
                run = {
                    "name": name,
                    "path": name,
                    "profile_format": "hpctoolkit",
                }

                runs.append(run)

        return runs

    @staticmethod
    def _scheme_dataset_map_caliper(data_path: str):
        """
        Derive the scheme for dataset_map for caliper format.
        """
        runs = []
        list_cali_paths = [
            f.path
            for f in os.scandir(data_path)
            if os.path.splitext(f.path)[1] == ".cali"
        ]

        for idx, subfolder_path in enumerate(list_cali_paths):
            name = subfolder_path.split("/")[-1]
            if name != ".callflow":
                run = {
                    "name": name.split(".")[0],
                    "path": name,
                    "profile_format": "caliper",
                }

                runs.append(run)

        return runs

    @staticmethod
    def _scheme_dataset_map_caliper_json(data_path: str):
        """
        Derive the scheme for dataset_map for caliper json format.
        """
        runs = []
        list_json_paths = [
            f.path
            for f in os.scandir(data_path)
            if os.path.splitext(f.path)[1] == ".json"
        ]

        for path in list_json_paths:
            filename = path.split("/")[-1]
            if filename != "config.json":
                run = {
                    "name": filename.split(".")[0],
                    "path": path.split("/")[-1],
                    "profile_format": "caliper_json",
                }
                runs.append(run)
        return runs

    @staticmethod
    def _read_directory(args):
        """
        Data directory read mode
        This function fills the config object with dataset information from the provided directory.
        """
        scheme = {}

        # Set data path
        scheme["data_path"] = os.path.abspath(args.data_dir)

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

        scheme["runs"] = []
        if "profile_format" in args:
            profile_format = args.profile_format

            LOGGER.debug(f"Scheme: {profile_format}")

            scheme["runs"] = _SCHEME_PROFILE_FORMAT_MAPPER[profile_format](
                scheme["data_path"]
            )
        else:
            scheme["runs"] = _SCHEME_PROFILE_FORMAT_MAPPER["default"](
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
        """
        GraphFrame mode for Jupyter notebooks.
        This function creates a config file based on the graphframes passed into the cmd line.
        """
        pass

    @staticmethod
    def _create_dot_callflow_folder(config):
        """
        Create a .callflow directory and empty files.
        """
        LOGGER.info(f".callflow directory is: {config['save_path']}")

        if not os.path.exists(config["save_path"]):
            os.makedirs(config["save_path"])
            os.makedirs(os.path.join(config["save_path"], "ensemble"))

        dataset_folders = [
            os.path.join(config["save_path"], k["name"]) for k in config["runs"]
        ]

        dataset_folders.append("ensemble")

        for dataset in dataset_folders:
            dataset_dir = os.path.join(config["save_path"], dataset)
            if not os.path.exists(dataset_dir):
                os.makedirs(dataset_dir)

            files = ["df.csv", "nxg.json", "hatchet_tree.txt", "auxiliary_data.json"]
            for f in files:
                fname = os.path.join(dataset_dir, f)
                if not os.path.exists(fname):
                    open(fname, "w").close()

    def _remove_dot_callflow_folder(self):
        """
        TODO: CAL-9: remove the .callflow folder when we re-process/re-write.
        """
        pass

    @staticmethod
    def _process_module_map(module_callsite_map):
        """
        Process module mapper file if a module map is provided.
        """
        ret = {}
        for module in module_callsite_map:
            callsites = module_callsite_map[module]
            for callsite in callsites:
                ret[callsite] = module
        return ret

    def __str__(self):
        items = ("%s = %r" % (k, v) for k, v in self.__dict__.items())
        return "<%s: {%s}> \n" % (self.__class__.__name__, ", ".join(items))

    def __repr__(self):
        return self.__str__()
