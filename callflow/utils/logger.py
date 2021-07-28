# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import logging
import colorlog
from logging import getLogger as get_logger  # noqa


# ------------------------------------------------------------------------------
LOG_FMT = (
    "%(asctime)s - %(name)s:%(funcName)s:%(lineno)s - %(levelname)s - %(message)s"
)
LOG_COLORS = {
    "DEBUG": "cyan",
    "INFO": "green",
    "WARNING": "purple",
    "ERROR": "bold_red",
    "CRITICAL": "red",
}

# ------------------------------------------------------------------------------
def append_mem_usage(message):
    from .utils import get_memory_usage
    return f"[{get_memory_usage()}]: {message}"

def _log_debug_with_memory(self, message, *args, **kws):
    self._log(logging.DEBUG, append_mem_usage(message), args, **kws)

def _log_info_with_memory(self, message, *args, **kws):
    self._log(logging.INFO, append_mem_usage(message), args, **kws)

def _log_warning_with_memory(self, message, *args, **kws):
    self._log(logging.WARNING, append_mem_usage(message), args, **kws)

def _log_error_with_memory(self, message, *args, **kws):
    self._log(logging.ERROR, append_mem_usage(message), args, **kws)

def _log_critical_with_memory(self, message, *args, **kws):
    self._log(logging.CRITICAL, append_mem_usage(message), args, **kws)

# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
def init_logger(**kwargs):

    # extract the logging parameters (defaults given)
    level = int(kwargs.get("level", 2))
    do_color = str(kwargs.get("color", True))
    file = str(kwargs.get("file", ""))
    mem_usage = bool(kwargs.get("mem_usage", False))

    # --------------------------------------------------------------------------
    # get logging level in "logging" format
    assert 1 <= level <= 5
    if level == 1:
        level = logging.DEBUG
    elif level == 2:
        level = logging.INFO
    elif level == 3:
        level = logging.WARN
    elif level == 4:
        level = logging.ERROR
    elif level == 5:
        level = logging.CRITICAL

    # -------------------------------------------------------------------------
    # get logging format
    # here, the initialization of the format doesnt depend upon "level"
    # create the actual formatter
    if do_color and file == "":
        formatter = colorlog.ColoredFormatter(
            "%(log_color)s" + LOG_FMT, log_colors=LOG_COLORS
        )
    else:
        formatter = logging.Formatter(LOG_FMT)

    # create a handler
    if file == "":
        sh = logging.StreamHandler()
        sh.setFormatter(formatter)
    else:
        sh = logging.FileHandler(file)
        sh.setFormatter(formatter)

    # finally, create a logger
    logger = logging.getLogger()  # root logger
    logger.setLevel(level)
    logger.addHandler(sh)

    # --------------------------------------------------------------------------
    # if we want to show the memory usage
    if mem_usage:
        logging.Logger.info = _log_info_with_memory
        logging.Logger.debug = _log_debug_with_memory
        logging.Logger.warning = _log_warning_with_memory
        logging.Logger.error = _log_error_with_memory
        logging.Logger.critical = _log_critical_with_memory

    return 
    # --------------------------------------------------------------------------
    # Print the level of logging.
    logger.debug("Enabled")
    logger.info("Enabled")
    logger.warning("Enabled")
    logger.error("Enabled")
    logger.critical("Enabled")

# ------------------------------------------------------------------------------
