# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import os
import callflow
from callflow.utils.utils import is_valid_json_with_schema, write_json

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
        "chunk_idx": {"type": "integer"},
        "chunk_size": {"type": "integer"},
        "ensemble_process": {"type": "boolean"},
        "experiment": {"type": "string"},
    },
}

CONFIG_KEYS = list(JSONSCHEMA_CONFIG["properties"].keys())


class Config:
    """
     e.g., properties = {
        'config': (str),
        'data_path': (str),
        'profile_format': (str),
        'process': (bool),
        'production': (bool),
        'filter_perc': (float),
        'filter_by': (str),
        'group_by': (str),
        'read_parameter': (bool),
        'save_path': (str),
        'verbose': (bool),
        'reset': False,
        'append_path': (str),
        'start_date': (timestamp),
        'end_date': (timestamp),
        'chunk_idx': (int),
        'chunk_size': (int),
        'ensemble_process': (bool)
    }
     1. Determine the read_mode from the arguments passed.
     2. Generate the config object containing the dataset information based on
        the read_mode.
     3. Create a .callflow directory if not present in the provided save_path.
     4. Dump the config file.
     5. Validate the generated or passed config object.
    """

    def __init__(self, properties):
        self.properties = properties
        self.read_mode = self.get_read_mode()

        _READ_MODES = {
            "config": self._read_config,
            "directory": self._read_directory,
            "gfs": self._read_gfs,
        }
        assert self.read_mode in _READ_MODES.keys()

        self.config = _READ_MODES[self.read_mode]()
        is_valid_json_with_schema(data=self.config, schema=JSONSCHEMA_CONFIG)

        # Prepare the data staging area.
        Config._prep_data_staging(self.config["save_path"], self.config["runs"])

        # Write the config file.
        if self.read_mode != "config":
            _config_filename = os.path.join(self.config["save_path"], "config.json")
            write_json(self.config, _config_filename)
            LOGGER.info(f"Config file has been dumped into {_config_filename}")

        LOGGER.debug(f"CallFlow instantiation configuration: {self.config}")

    def __str__(self):
        items = ("%s = %r" % (k, v) for k, v in self.__dict__.items())
        return "<%s: {%s}> \n" % (self.__class__.__name__, ", ".join(items))

    def __repr__(self):
        return self.__str__()

    def get_config(self):
        return self.config

    def get_read_mode(self):
        """
        Determines the read mode for CallFlow based on the properties.
        If `config` key is provided, read_mode = "config".
        If `data_path` key is provided, read_mode = "directory".
        If `gfs` key is provided, read_mode = "gfs".

        If both are provided, CallFlow chooses "config" as it can contain more
        information.
        """
        read_mode = ""
        _has_config = self.properties["config"] is not None
        _has_dpath = self.properties["data_path"] is not None
        # _has_gfs = self.properties["gfs"] is not None

        if _has_config:
            read_mode = "config"

        elif _has_dpath:
            read_mode = "directory"

        # elif _has_gfs:
        #     read_mode = "gfs"

        return read_mode

    # --------------------------------------------------------------------------
    def _read_directory(self):
        """
        Data directory read mode
        This function fills the config object with dataset information from the provided directory.
        """
        scheme = {}
        for _ in CONFIG_KEYS:
            if _ in self.properties:
                scheme[_] = self.properties[_]

        scheme["experiment"] = os.path.basename(scheme["data_path"])
        if len(scheme["save_path"]) == 0:
            scheme["save_path"] = os.path.join(scheme["data_path"], ".callflow")

        # Set the datasets key, according to the format.
        scheme["runs"] = Config._scheme_dataset_map(
            self.properties.get("profile_format", "default"),
            os.path.join(scheme["data_path"], scheme["append_path"]),
        )

        return scheme

    def _read_config(self):
        """
        Config file read mode.
        This function would overwrite all the automatic config with the user-provided config.
        """
        _configfile = self.properties["config"]
        json = callflow.utils.utils.read_json(_configfile)
        callflow.utils.utils.is_valid_json_with_schema(
            data=json, schema=JSONSCHEMA_CONFIG
        )

        # ----------------------------------------------------------------------
        scheme = {}

        for _ in CONFIG_KEYS:
            if _ in json:
                scheme[_] = json[_]

            elif _ in self.properties:
                scheme[_] = self.properties[_]

            if _ in scheme:
                scheme[_] = Config._match_config_type(_, scheme[_])

        # Set the data_path, which is data directory.
        if len(scheme["experiment"]) == 0:
            scheme["experiment"] = os.path.basename(json["data_path"])

        if self.properties.get("save_path") != "":
            scheme["save_path"] = os.path.join(
                os.path.abspath(self.properties.get("save_path")), ".callflow"
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
            scheme["runs"] = Config._scheme_dataset_map(
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
            scheme["callsite_module_map"] = Config._process_module_map(
                json["module_callsite_map"]
            )

        return scheme

    @staticmethod
    def _match_config_type(key, val):
        """
        Wrapper function to ensure the scheme properties match their assigned type.
        """
        bools = ["ensemble_process"]
        ints = ["chunk_idx", "chunk_size"]
        floats = ["filter_perc"]

        if key in bools:
            val = bool(val)

        if key in ints:
            val = int(val)

        if key in floats:
            val = float(val)

        return val

    # --------------------------------------------------------------------------
    def _read_gfs(self):
        """
        GraphFrame mode for Jupyter notebooks.
        This function creates a config file based on the graphframes passed into the cmd line.
        """
        assert False

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

            return [_mdict(_, _, pformat) for _ in list_subdirs(data_path)]

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
