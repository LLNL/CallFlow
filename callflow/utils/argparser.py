# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import os
import argparse

import callflow

LOGGER = callflow.get_logger(__name__)

SUPPORTED_PROFILE_FORMATS = ["hpctoolkit", "caliper_json", "caliper"]

# ------------------------------------------------------------------------------
JSONSCHEMA_CONFIG = {
    "type": "object",
    "properties": {
        "append_path": {"type": "string"},
        "data_path": {"type": "string"},
        "save_path": {"type": "string"},
        "read_parameter": {"type": "boolean"},
        "filter_perc": {"type": "number"},
        "filter_by": {"type": "string"},
        "group_by": {"type": "string"},
        "module_callsite_map": {"type": "object"},
        "chunk_idx": {"type": "string"},
        "chunk_size": {"type": "string"},
        "ensemble_process": {"type": "boolean"},
        "experiment": {"type": "string"},
    },
}

CONFIG_KEYS = list(JSONSCHEMA_CONFIG["properties"].keys())


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
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

    def __init__(self, args_string):

        assert isinstance(args_string, list)

        from callflow.utils.utils import is_valid_json_with_schema, write_json

        # Parse the arguments passed.
        self.parser = ArgParser._create_parser()
        self.args = vars(self.parser.parse_args())
        LOGGER.debug(f"Args: ({self.args})")

        # Verify if only valid things are passed.
        # Read mode determines how arguments will be consumed by CallFlow.
        self.read_mode = self._verify_parser()
        LOGGER.info(f"Read mode: {self.read_mode}")

        # Call the appropriate function belonging to the format.
        _READ_MODES = {
            "config": self._read_config,
            "directory": self._read_directory,
            # "gfs": self._read_gfs,
        }
        assert self.read_mode in _READ_MODES.keys()
        self.config = _READ_MODES[self.read_mode]()
        is_valid_json_with_schema(data=self.config, schema=JSONSCHEMA_CONFIG)

        # Prepare the data staging area.
        ArgParser._prep_data_staging(self.config["save_path"], self.config["runs"])

        # Write the config file.
        if self.read_mode != "config":
            _config_filename = os.path.join(self.config["save_path"], "config.json")
            write_json(self.config, _config_filename)

        LOGGER.debug(f"CallFlow instantiation configuration: {self.config}")

    def __str__(self):
        items = ("%s = %r" % (k, v) for k, v in self.__dict__.items())
        return "<%s: {%s}> \n" % (self.__class__.__name__, ", ".join(items))

    def __repr__(self):
        return self.__str__()

    # --------------------------------------------------------------------------
    # Private methods.
    @staticmethod
    def _create_parser():
        """
        Parse the input arguments.
        """
        parser = argparse.ArgumentParser(prefix_chars="--")
        # -------------
        # config mode
        parser.add_argument(
            "--config", type=str, help="Config file to be processed (overwrites)."
        )
        """
        # gfs mode
        parser.add_argument("--gfs", type=str,
                            help="Enter graph frames")
        """
        # args mode
        parser.add_argument(
            "--data_path", type=str, help="Input directory to be processed."
        )
        parser.add_argument(
            "--profile_format", choices=SUPPORTED_PROFILE_FORMATS, help="Profile format"
        )

        parser.add_argument(
            "--process",
            action="store_true",
            help="Process mode. "
            "To preprocess at the required granularity, "
            "use the options --filter, --entire.",
        )

        parser.add_argument(
            "--production", action="store_true", help="Launch app on production server."
        )

        parser.add_argument(
            "--filter_perc", type=float, default=0.0, help="Set filter percentage"
        )
        parser.add_argument(
            "--filter_by",
            type=str,
            default="time (inc)",
            help="Set filter by (e.g., time or time (inc))",
        )

        parser.add_argument(
            "--group_by",
            type=str,
            default="module",
            help="Set group by. "
            "(e.g., grouping by 'name' column gets call graph "
            "and grouping by 'module' produces a super graph)",
        )

        parser.add_argument(
            "--read_parameter", action="store_true", help="Enable parameter analysis"
        )

        parser.add_argument(
            "--save_path",
            type=str,
            default="",
            help="Save path for the processed files",
        )

        parser.add_argument(
            "--verbose", action="store_true", help="Display debug points"
        )

        parser.add_argument(
            "--log",
            type=str,
            default="stdout",
            help="Path for logfile (stdout if no path is given)",
        )

        parser.add_argument(
            "--reset",
            action="store_true",
            help="Resets the .callflow directory to re-process entire ensemble",
        )

        parser.add_argument(
            "--append_path",
            type=str,
            default="",
            help="Appends the path to the directory passed as --data_path",
        )

        parser.add_argument(
            "--start_date",
            type=str,
            default="",
            help="Start date to look for in the dataset name. Use format: {dataset}_{YYYY-MM-DD}_{HH-MM-SS}",
        )

        parser.add_argument(
            "--end_date",
            type=str,
            default="",
            help="End date to look for in the dataset name. Use format: {dataset}_{YYYY-MM-DD}_{HH-MM-SS}",
        )

        parser.add_argument(
            "--chunk_idx",
            type=str,
            default="0",
            help="",
        )

        parser.add_argument(
            "--chunk_size",
            type=str,
            default="0",
            help="",
        )

        parser.add_argument(
            "--ensemble_process",
            action="store_true",
            help="Enables ensemble SuperGraph construction",
        )

        # -------------
        return parser

    def _verify_parser(self):
        """
        Verify the input arguments.

        Raises expections if something is not provided
        Check if the config file is provided and exists!

        :pargs : argparse.Namespace
            Arguments passed by the user.

        Returns
        -------
        process_mode: 'config' or 'directory' or 'gfs'
            Process mode with which CallFlow will process the data.
        """
        read_mode = ""
        _has_config = self.args["config"] is not None
        _has_dpath = self.args["data_path"] is not None
        # _has_gfs = self.args["gfs"] is not None

        if not _has_config and not _has_dpath:  # and not _has_gfs:
            s = "Please provide a config file (or) a directory"  # (or) graph frames"
            LOGGER.error(s)
            self.parser.print_help()
            exit(1)

        if _has_config:
            read_mode = "config"
            if not os.path.isfile(self.args["config"]):
                s = "Config file ({}) not found!".format(self.args["config"])
                LOGGER.error(s)
                exit(1)

        elif self.args["data_path"]:
            read_mode = "directory"
            if not os.path.isdir(self.args["data_path"]):
                s = "Data directory ({}) not found!".format(self.args["data_path"])
                LOGGER.error(s)
                exit(1)

            if not self.args["profile_format"]:
                s = "Provide format using --profile_format"
                LOGGER.error(s)
                exit(1)

        """
        elif self.args["gfs"]:
            read_mode = "graphframes"
            # TODO: CAL-8: Add graphframe processing for Jupyter notebooks
        """
        return read_mode

    # --------------------------------------------------------------------------
    '''
    def _read_gfs(self):
        """
        GraphFrame mode for Jupyter notebooks.
        This function creates a config file based on the graphframes passed into the cmd line.
        """
        assert False
    '''
    # --------------------------------------------------------------------------
    def _read_directory(self):
        """
        Data directory read mode
        This function fills the config object with dataset information from the provided directory.
        """
        scheme = {}
        for _ in CONFIG_KEYS:
            if _ in self.args:
                scheme[_] = self.args[_]

        scheme["experiment"] = os.path.basename(scheme["data_path"])
        if len(scheme["save_path"]) == 0:
            scheme["save_path"] = os.path.join(scheme["data_path"], ".callflow")

        # Set the datasets key, according to the format.
        scheme["runs"] = ArgParser._scheme_dataset_map(
            self.args.get("profile_format", "default"),
            os.path.join(scheme["data_path"], scheme["append_path"]),
        )

        return scheme

    # --------------------------------------------------------------------------
    def _read_config(self):
        """
        Config file read mode.
        This function would overwrite all the automatic config with the user-provided config.
        """
        _configfile = self.args["config"]
        json = callflow.utils.utils.read_json(_configfile)
        callflow.utils.utils.is_valid_json_with_schema(
            data=json, schema=JSONSCHEMA_CONFIG
        )

        # ----------------------------------------------------------------------
        scheme = {}

        for _ in CONFIG_KEYS:
            if _ in json:
                scheme[_] = json[_]

            elif _ in self.args:
                scheme[_] = self.args[_]

        # Set the data_path, which is data directory.
        if len(scheme["experiment"]) == 0:
            scheme["experiment"] = os.path.basename(json["data_path"])

        if self.args.get("save_path") != "":
            scheme["save_path"] = os.path.join(
                os.path.abspath(self.args.get("save_path")), ".callflow"
            )

        if len(scheme["save_path"]) == 0:
            scheme["save_path"] = os.path.join(scheme["data_path"], ".callflow")

        _has_runs = "runs" in json
        _has_glb_pformat = "profile_format" in json

        if not _has_runs and not _has_glb_pformat:
            s = "Either 'runs' or 'profile_format' key must be provided in the config file."
            LOGGER.error(s)
            exit(1)

        # process all runs using the default profile
        elif _has_runs and not _has_glb_pformat:
            scheme["runs"] = ArgParser._scheme_dataset_map(
                "default", run_props=json["runs"]
            )

        # process data using the global format
        elif "runs" not in json and "profile_format" in json:
            s = "Please provide a config or a data directory that contains runs"
            LOGGER.error(s)
            exit(1)

        # TODO: Cleanup this with a new file that has the module mapping.
        if "module_callsite_map" in json:
            scheme["module_callsite_map"] = json["module_callsite_map"]
            scheme["callsite_module_map"] = ArgParser._process_module_map(
                json["module_callsite_map"]
            )

        if "m2c" in json:
            scheme["m2c"] = json["m2c"]

        if "m2m" in json:
            scheme["m2m"] = json["m2m"]

        return scheme

    # --------------------------------------------------------------------------
    # --------------------------------------------------------------------------
    @staticmethod
    def _scheme_dataset_map(pformat, data_path: str = "", run_props: dict = None):
        from callflow.utils.utils import list_subdirs, list_files

        _mdict = lambda n, p, f: {"name": n, "path": p, "profile_format": f}  # noqa
        if pformat == "hpctoolkit":
            _metric_db_files = [
                f for f in os.listdir(data_path) if f.endswith(".metric-db")
            ]
            _experiment_xml_files = [
                f for f in os.listdir(data_path) if f.endswith("experiment.xml")
            ]

            if len(_metric_db_files) > 0 and len(_experiment_xml_files) > 0:
                # TODO: should be a better way to do
                name = os.path.basename(data_path)
                if name == "":
                    name = os.path.basename(os.path.dirname(data_path))
                return [_mdict(name, "", pformat)]

            return [_mdict(_, _, pformat) for _ in list_subdirs(data_path, exclude_subdirs=['.callflow'])]

        if pformat == "caliper":
            return [
                _mdict(_.split(".")[0], _, pformat)
                for _ in list_files(data_path, ".cali")
            ]

        if pformat == "caliper_json":
            return [
                _mdict(_.split(".")[0], _, pformat)
                for _ in list_files(data_path, ".json", ["config.json"])
            ]

        # default!
        return [
            _mdict(_["name"], _["path"], _["profile_format"])
            for i, _ in enumerate(run_props)
        ]

    # --------------------------------------------------------------------------
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

    # --------------------------------------------------------------------------
    @staticmethod
    def _prep_data_staging(dot_cf_path, runs: list = []):
        """
        Create a staging directory for data.
        """
        LOGGER.info(f"CallFlow is staging data in ({dot_cf_path})")

        if not os.path.exists(dot_cf_path):
            os.makedirs(dot_cf_path)
            os.makedirs(os.path.join(dot_cf_path, "ensemble"))

        dataset_folders = [k["name"] for k in runs]
        dataset_folders.append("ensemble")

        for dataset in dataset_folders:
            dataset_dir = os.path.join(dot_cf_path, dataset)
            if not os.path.exists(dataset_dir):
                os.makedirs(dataset_dir)

    @staticmethod
    def _remove_data_staging(dot_cf_path):
        """
        TODO: CAL-9: remove the .callflow folder when we re-process/re-write.
        """
        pass

    # --------------------------------------------------------------------------
