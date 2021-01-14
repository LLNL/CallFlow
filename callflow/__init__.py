# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

# callflow.__init__.py
from .utils.logger import init_logger, get_logger
from .datastructures import SuperGraph, EnsembleGraph
from .callflow import CallFlow

from .server.notebook_server import load_ipython_extension

'''
# ------------------------------------------------------------------------------
def load_ipython_extension(ipython):
    """IPython API entry point.
    Only intended to be called by the IPython runtime.
    See:
      https://ipython.readthedocs.io/en/stable/config/extensions/index.html
    """
    _load_ipython_extension(ipython)
'''

# CallFlow's public API.
__all__ = [
    "init_logger",
    "get_logger",
    "SuperGraph",
    "EnsembleGraph",
    "CallFlow",
]

# ------------------------------------------------------------------------------
