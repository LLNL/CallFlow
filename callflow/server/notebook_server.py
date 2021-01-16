# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

# NOTE: The manager.py adopts Tensorboard's philosophy of launching applications
# through the IPython interface.
# The code can be found at https://github.com/tensorflow/tensorboard/blob/master/tensorboard/notebook.py
# ------------------------------------------------------------------------------

import callflow

def load_ipython_extension(ipython):
    """
    Load the CallFLow notebook extension.
    Intended to be called from `%load_ext callflow`. Do not invoke this
    directly.

    :param ipython: An `IPython.InteractiveShell` instance.
    """
    _register_magics(ipython)

def _register_magics(ipython):
    """
    Register IPython line/cell magics.
    
    :param ipython: An `InteractiveShell` instance.
    """
    ipython.register_magic_function(
        _start_magic,
        magic_kind="line",
        magic_name="callflow",
    )

def _start_magic(line):
    """
    Implementation of the `%callflow` line magic.
    Launches and display a CallFlow instance as if at the command line.
    
    :param line: text (command-line arguments) passed using %callflow
    """
    callflow.CallFlowServer(args=line, env="JUPYTER")
