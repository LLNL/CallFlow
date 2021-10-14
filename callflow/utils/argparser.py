# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import os
import argparse

import callflow

LOGGER = callflow.get_logger(__name__)

SUPPORTED_PROFILE_FORMATS = ["hpctoolkit", "caliper"]


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class ArgParser:
    """
    Argparser class decodes the arguments passed to the execution of CallFlow.

    The class performs the following actions:
    1. Parse the command line arguments.
    2. Verify if the required parameters are provided.
    """

    def __init__(self, args_string):

        assert isinstance(args_string, list)

        # Parse the arguments passed.
        self.parser = ArgParser._create_parser()
        self.args = vars(self.parser.parse_args())
        LOGGER.debug(f"Args: ({self.args})")

        # Verify if only valid things are passed.
        # Read mode determines how arguments will be consumed by CallFlow.
        self._verify_parser()

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
            type=int,
            default=0,
            help="Chunk index to start processing from.",
        )

        parser.add_argument(
            "--chunk_size",
            type=int,
            default=0,
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
        _has_config = self.args["config"] is not None
        _has_dpath = self.args["data_path"] is not None
        # _has_gfs = self.args["gfs"] is not None

        if not _has_config and not _has_dpath:  # and not _has_gfs:
            s = "Please provide a config file (or) a directory"  # (or) graph frames"
            LOGGER.error(s)
            self.parser.print_help()
            exit(1)

        if _has_config:
            if not os.path.isfile(self.args["config"]):
                s = "Config file ({}) not found!".format(self.args["config"])
                LOGGER.error(s)
                exit(1)

        elif _has_dpath:
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
