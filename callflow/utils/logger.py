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
import logging
import colorlog

class Log:

    aliases = {
        logging.ERROR:    ("error", "err", "e"),
        logging.WARNING:  ("warning", "warn", "w"),
        logging.INFO:     ("info", "inf", "nfo", "i"),
        }

    def __init__(self, lvl=logging.DEBUG):
        self.lvl = lvl
#        format  ="\033[1m CallFlow: [" + action + "] %(log_color)s%(message)s%(reset)s"
        format  ="\033[1m #  %(log_color)s%(message)s%(reset)s"
        self.format = format
        logging.root.setLevel(self.lvl)
        self.formatter = colorlog.ColoredFormatter(self.format)
        self.stream = logging.StreamHandler()
        self.stream.setLevel(self.lvl)
        self.stream.setFormatter(self.formatter)
        self.logger = logging.getLogger('pythonConfig')
        self.logger.setLevel(self.lvl)
        self.logger.addHandler(self.stream)

    def debug(self, msg, *args, **kwargs):
        for line in str(msg).splitlines():
            self.logger.error(line, *args, **kwargs)
    dbg = d = debug

    def warn(self, msg, *args, **kwargs):
        for line in str(msg).splitlines():
            self.logger.warn(line, *args, **kwargs)

    warning = w = warn

    def info(self, msg, *args, **kwargs):
        for line in str(msg).splitlines():
            self.logger.info(line, *args, **kwargs)

    inf = i = info

    def _parse_level(self, lvl):
        for log_level in self.aliases:
            if lvl == log_level or lvl in self.aliases[log_level]:
                return log_level
        raise TypeError('not a logging level: %s'%lvl)

    def level(self, lvl=None):
        if not lvl:
            return self.lvl
        self.lvl = self._parse_level(lvl)
        self.stream.setLevel(self.lvl)
        self.logging.root.setLevel(self.lvl)

log = Log()
