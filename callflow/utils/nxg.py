# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------


def nxg_info(nxg):
    return f"Nodes: {len(nxg.nodes())}, edges: {len(nxg.edges())}."
