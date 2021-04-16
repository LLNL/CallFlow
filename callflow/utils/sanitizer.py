# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------
import os
import hatchet as ht
import datetime
#import arrow

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
    def fmt_time(string):
        """
        Format according to daniel's data format.

        e.g., laghos_2020-12-04_01-04-11 => 2020-12-04 01:04:11
        """
        fmt_from = '%Y-%m-%d_%H-%M-%S'
        fmt_to = '%Y-%m-%d %H:%M:%S'

        toks = string.split('_')
        dataname, tstamp = toks[0], '_'.join(toks[1:])
        dt = datetime.datetime.strptime(tstamp, fmt_from)
        return datetime.datetime.strftime(dt, fmt_to)

        '''
        try: 
            time = string.split("_")[1:]
            date = time[0]
            hhmmss = ":".join(time[1].split("-"))
            ret = " ".join([date, hhmmss])
            return arrow.get(ret)
        except:
            s = "Incorrect dataset labelling!! Please use the format 'dataset_YYYY-MM-DD_HH-MM-SS' "
            LOGGER.error(s)
            exit(1)
        '''
# ------------------------------------------------------------------------------
