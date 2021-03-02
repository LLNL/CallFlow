# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
Instantiates CallFlow's public API.
"""
from .version import __version__  # noqa
from .utils.logger import init_logger, get_logger
from .datastructures import SuperGraph, EnsembleGraph

__all__ = [
    "init_logger",
    "get_logger",
    "SuperGraph",
    "EnsembleGraph",
]


# ------------------------------------------------------------------------------
'''
def load_ipython_extension(ipython):
    """IPython API entry point.
    Only intended to be called by the IPython runtime.
    See:
      https://ipython.readthedocs.io/en/stable/config/extensions/index.html
    """
    # TODO: this needs to be fixed
    from .server.main import main
    from .server.notebook_server import load_ipython

    load_ipython(ipython, main)
'''

# ------------------------------------------------------------------------------
