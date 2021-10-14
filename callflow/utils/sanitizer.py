# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
import os
import hatchet as ht
import datetime

# import arrow

import callflow

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class Sanitizer:

    _KNOWN_TYPES = ["function", "statement", "loop", "region"]

    @staticmethod
    def sanitize(_: str):
        return os.path.basename(_) if _ is not None else "Unknown"

    @staticmethod
    def from_htframe(_: ht.frame.Frame):
        assert isinstance(_, ht.frame.Frame)

        _type = _["type"]
        assert _type in Sanitizer._KNOWN_TYPES

        if _type in ["function", "region"]:
            return Sanitizer.sanitize(_.get("name", "Unknown"))

        elif _type == "statement":
            _file, _line = _["file"], str(_["line"])
            return Sanitizer.sanitize(_file) + ":" + _line

        elif _type == "loop":
            _file, _line = _["file"], str(_["line"])
            return "Loop@" + Sanitizer.sanitize(_file) + ":" + _line

    @staticmethod
    def fmt_time(tstamp):
        """
        Format according to daniel's data format.

        e.g., laghos_2020-12-04_01-04-11 => 2020-12-04 01:04:11
        """
        fmt_from = "%Y-%m-%d_%H-%M-%S"
        fmt_to = "%Y-%m-%d %H:%M:%S"

        try:
            dt = datetime.datetime.strptime(tstamp, fmt_from)
            return datetime.datetime.strftime(dt, fmt_to)
        except ValueError as e:
            LOGGER.warn("Not a valid timestamp.")
            LOGGER.warn(e)
            return tstamp


    def datetime_to_fmt(datetime):
        fmt_to = "%Y-%m-%d %H:%M:%S"
        return datetime.strftime(fmt_to)

    @staticmethod
    def fmt_timestr_to_datetime(string):
        fmt_to = "%Y-%m-%d %H:%M:%S"

        return datetime.datetime.strptime(string, fmt_to)


# ------------------------------------------------------------------------------
