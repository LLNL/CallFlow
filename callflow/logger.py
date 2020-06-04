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
import os
import time
import logging
import colorlog

from logging import getLogger as get_logger

# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
def init_logger(**kwargs):

    # --------------------------------------------------------------------------
    # extract the logging parameters (defaults given)
    level      = int(kwargs.get('level', 2))
    do_color   = str(kwargs.get('color', True))

    #print ('level = ({})'.format(level))
    #print ('do_color = ({})'.format(do_color))

    # --------------------------------------------------------------------------
    # get logging level in "logging" format
    assert level >= 1 and level <= 5
    if level == 1:  level = logging.DEBUG
    if level == 2:  level = logging.INFO
    if level == 3:  level = logging.WARN
    if level == 4:  level = logging.ERROR
    if level == 5:  level = logging.CRITICAL

    # --------------------------------------------------------------------------
    # get loging format
    '''
    aliases = {
        logging.DEBUG: "%(log_color)s(%(name)s.py) %(msg)s ",
        logging.ERROR: "\033 %(log_color)s(%(name)s.py) ERROR: %(msg)s",
        logging.CRITICAL: "\033 %(log_color)s(%(name)s.py) CRITICAL: %(msg)s",
        logging.WARNING: "\033 %(log_color)s(%(name)s.py) WARN: %(msg)s",
        logging.INFO: "%(log_color)s%(msg)s",
    }
    LOG_FMT = aliases[level]
    '''

    # Harsh's suggestion
    # here, the initialization of the format doesnt depend upon "level"
    LOG_FMT = '%(asctime)s - %(name)s:%(funcName)s:%(lineno)s - %(levelname)s - %(message)s'

    # create the actual formatter
    if do_color:
        LOG_COLORS = {
            'DEBUG': 'cyan',
            'INFO': 'green',
            'WARNING': 'yellow',
            'ERROR': 'red',
            'CRITICAL': 'red',
        }
        formatter = colorlog.ColoredFormatter('%(log_color)s' + LOG_FMT,
                                                        log_colors=LOG_COLORS)
    else:
        formatter = logging.Formatter(LOG_FMT)

    # --------------------------------------------------------------------------
    # create a stream handler
    sh = logging.StreamHandler()
    sh.setFormatter(formatter)

    # finally, create a logger
    logger = logging.getLogger()        # root logger
    logger.setLevel(level)
    logger.addHandler(sh)

    return
    # --------------------------------------------------------------------------
    # Print the level of logging.
    logger.debug('Enabled')
    logger.info('Enabled')
    logger.warning('Enabled')
    logger.error('Enabled')
    logger.critical('Enabled')