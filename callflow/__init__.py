# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

# callflow.__init__.py
from .utils.logger import init_logger, get_logger
from .datastructures import SuperGraph, EnsembleGraph


# ------------------------------------------------------------------------------
def load_ipython_extension(ipython):
    """IPython API entry point.
    Only intended to be called by the IPython runtime.
    See:
      https://ipython.readthedocs.io/en/stable/config/extensions/index.html
    """
    # TODO: this needs to be fixed
    from .server.callflow_server import main
    from .server.notebook_server import load_ipython_extension
    load_ipython_extension(ipython, main)


# ------------------------------------------------------------------------------
# CallFlow's public API.
__all__ = [
    "init_logger",
    "get_logger",
    "SuperGraph",
    "EnsembleGraph",
]

# ------------------------------------------------------------------------------
