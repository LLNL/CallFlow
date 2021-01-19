# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np

import callflow
LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class Filter:

    VALID_MODES = ["time", "time (inc)"]

    def __init__(self, sg, filter_by="time (inc)", filter_perc=10.):

        assert isinstance(sg, callflow.SuperGraph)
        assert isinstance(filter_by, str) and isinstance(filter_perc, (int, float))
        assert filter_by in Filter.VALID_MODES
        assert 0. <= filter_perc <= 100.

        self.sg = sg
        self.filter_by = filter_by
        self.filter_perc = filter_perc

        self.compute()

    # --------------------------------------------------------------------------
    def compute(self):

        LOGGER.info(f'Filtering ({self.sg}) by \"{self.filter_by}\" = {self.filter_perc}%')

        # ----------------------------------------------------------------------
        # compute the min/max
        min_vals = {}
        max_vals = {}
        for mode in Filter.VALID_MODES:
            _mn, _mx = self.sg.df_minmax(mode)
            min_vals[mode] = np.array([_mn])
            max_vals[mode] = np.array([_mx])
            LOGGER.debug(f"{mode}:  min = {_mn}, max = {_mx}")

        # ----------------------------------------------------------------------
        if self.filter_by == "time (inc)":
            value = self.filter_perc * 0.01 * np.max(max_vals["time (inc)"])
            self.sg.filter_sg(self.filter_by, value)

        elif self.filter_by == "time":
            value = self.filter_perc
            self.sg.filter_sg(self.filter_by, value)

# ------------------------------------------------------------------------------
