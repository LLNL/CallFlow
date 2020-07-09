# *******************************************************************************
# * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
# * Produced at the Lawrence Livermore National Laboratory.
# *
# * Written by Suraj Kesavan <htpnguyen@ucdavis.edu>.
# *
# * LLNL-CODE-740862. All rights reserved.
# *
# * This file is part of CallFlow. For details, see:
# * https://github.com/LLNL/CallFlow
# * Please also read the LICENSE file for the MIT License notice.
# ******************************************************************************
# Library imports
from scipy.stats import iqr
import collections
import numpy as np

import callflow

LOGGER = callflow.get_logger(__name__)

class BoxPlot:
    def __init__(self, df):
        self.q = {}
        self.q["Inclusive"] = self.quartiles(df, attr="time (inc)")
        self.q["Exclusive"] = self.quartiles(df, attr="time")

        self.outliers = {}
        self.outliers["Inclusive"] = self.iqr_outlier(df, attr="time (inc)", axis=0)
        self.outliers["Exclusive"] = self.iqr_outlier(df, attr="time", axis=0)

    def median(self, arr):
        indices = []

        list_size = len(arr)
        median = 0
        if list_size % 2 == 0:
            indices.append(int(list_size / 2) - 1)  # -1 because index starts from 0
            indices.append(int(list_size / 2))

            median = (arr[indices[0]] + arr[indices[1]]) / 2
            pass
        else:
            indices.append(int(list_size / 2))

            median = arr[indices[0]]
            pass

        return median, indices
        pass

    def quartiles_old(self, df, attr=""):
        if len(samples) == 1:
            quartiles = [samples[0]] * 5
        else:
            median, median_indices = self.median(samples)
            q1, q1_indices = self.median(samples[: median_indices[0]])
            q3, q3_indices = self.median(samples[median_indices[-1] + 1 :])

            minimum = samples[0]
            maximum = samples[len(samples) - 1]

            quartiles = [minimum, q1, median, q3, maximum]

        return quartiles

    def quartiles(self, df, attr=""):
        samples = sorted(df[attr].tolist())
        quartiles = np.quantile(np.array(samples), [0, 0.25, 0.5, 0.75, 1.0]).tolist()
        return quartiles

    def q1(self, x, axis=None):
        return np.percentile(x, 25, axis=axis)

    def q3(self, x, axis=None):
        return np.percentile(x, 75, axis=axis)

    def iqr_outlier(self, df, attr="", axis=None, bar=1.5, side="both"):
        assert side in ["gt", "lt", "both"], "Side should be `gt`, `lt` or `both`."

        data = np.array(df[attr])
        dataset_data = np.array(df["dataset"])
        rank_data = np.array(df["rank"])
        d_iqr = iqr(data, axis=axis)
        d_q1 = self.q1(data, axis=axis)
        d_q3 = self.q3(data, axis=axis)
        iqr_distance = np.multiply(d_iqr, bar)

        stat_shape = list(data.shape)

        if isinstance(axis, collections.Iterable):
            for single_axis in axis:
                stat_shape[single_axis] = 1
        else:
            stat_shape[axis] = 1

        if side in ["gt", "both"]:
            upper_range = d_q3 + iqr_distance
            upper_outlier = np.greater(data - upper_range.reshape(stat_shape), 0)

        if side in ["lt", "both"]:
            lower_range = d_q1 - iqr_distance
            lower_outlier = np.less(data - lower_range.reshape(stat_shape), 0)

        if side == "gt":
            mask = upper_outlier
        if side == "lt":
            mask = lower_outlier
        if side == "both":
            mask = np.logical_or(upper_outlier, lower_outlier)

        return {
            "values": (mask * data).tolist(),
            "datasets": (mask * dataset_data).tolist(),
            "ranks": (mask * rank_data).tolist(),
        }
