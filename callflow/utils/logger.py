# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import logging
import colorlog
from logging import getLogger as get_logger  # noqa


# ------------------------------------------------------------------------------
LOG_PROFILE = logging.CRITICAL + 1


def _log_profile(self, message, *args, **kws):
    if self.isEnabledFor(LOG_PROFILE):
        self._log(LOG_PROFILE, message, args, **kws)


logging.addLevelName(LOG_PROFILE, "PROFILE")
logging.Logger.profile = _log_profile
# ------------------------------------------------------------------------------


# ------------------------------------------------------------------------------
def init_logger(**kwargs):

    # extract the logging parameters (defaults given)
    level = int(kwargs.get("level", 2))
    do_color = str(kwargs.get("color", True))

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
    LOG_FMT = (
        "%(asctime)s - %(name)s:%(funcName)s:%(lineno)s - %(levelname)s - %(message)s"
    )
    LOG_COLORS = {
        "DEBUG": "cyan",
        "INFO": "green",
        "WARNING": "purple",
        "ERROR": "bold_red",
        "CRITICAL": "red",
        "PROFILE": "bold_red",
    }

    # create the actual formatter
    if do_color:
        formatter = colorlog.ColoredFormatter(
            "%(log_color)s" + LOG_FMT, log_colors=LOG_COLORS
        )
    else:
        formatter = logging.Formatter(LOG_FMT)

    # --------------------------------------------------------------------------
    # create a stream handler
    sh = logging.StreamHandler()
    sh.setFormatter(formatter)

    # finally, create a logger
    logger = logging.getLogger()  # root logger
    logger.setLevel(level)
    logger.addHandler(sh)

    return
    # --------------------------------------------------------------------------
    # Print the level of logging.
    logger.debug("Enabled")
    logger.info("Enabled")
    logger.warning("Enabled")
    logger.error("Enabled")
    logger.critical("Enabled")


# ------------------------------------------------------------------------------
