# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's operation to calculate the rank and dataset histograms.
"""
import pandas as pd
import itertools
from callflow.utils.df import df_count

import callflow
from callflow.utils.utils import histogram
from callflow.datastructures.metrics import TIME_COLUMNS

LOGGER = callflow.get_logger(__name__)


# ------------------------------------------------------------------------------
class Histogram:
    """
    Calculate Histogram based on the mode, "rank" (per rank), "name" (all ranks), "dataset" (per dataset) modes.
    """

    HISTO_TYPES = ["rank", "name", "dataset"]

    def __init__(
        self,
        sg,
        rel_sg=None,
        name="",
        ntype="",
        bins=20,
        histo_types=[],
    ):
        """
        Constructor for the histogram computation.

        :param sg: (CallFlow.SuperGraph) SuperGraph
        :param rel_sg: (CallFlow.SuperGraph) Relative SuperGraph
        :param name: (str) Name of the node
        :param ntype: (str) type of node (i.e., callsite or module)
        :param histo_types: (list) Histogram types (e.g., name, rank, and dataset)
        :param bins: (int) Number of bins in the histogram
        """
        assert isinstance(sg, callflow.SuperGraph)
        if rel_sg is not None:
            assert isinstance(rel_sg, callflow.SuperGraph)
        assert isinstance(bins, int)
        assert isinstance(histo_types, list)
        assert bins > 0
        assert ntype in ["callsite", "module"]

        dataframe = sg.get_aux_df(name, ntype)
        if rel_sg is not None:
            rel_dataframe = rel_sg.get_aux_df(name, ntype)

        self.time_columns = [sg.proxy_columns.get(_, _) for _ in TIME_COLUMNS]
        self.result = {_: {} for _ in TIME_COLUMNS}

        if len(histo_types) == 0:
            self.histo_types = Histogram.HISTO_TYPES
        else:
            self.histo_types = histo_types

        # for each type of histogram and each time column
        for h, (tk, tv) in itertools.product(
            self.histo_types, zip(TIME_COLUMNS, self.time_columns)
        ):

            # compute the range of the actual data
            df = self._get_data_by_histo_type(dataframe, h)[tv]
            drng = [df.min(), df.max()]

            # compute the range df relative to the provided relative_to_df.
            if rel_sg is None:
                # Note: For single super graph, it will enter the `if` case;
                rrng = drng
            else:
                # Note: For ensemble super graph, we calculate relative to the
                # ensemble_df.
                rdf = self._get_data_by_histo_type(rel_dataframe, h)[tv]
                rrng = [rdf.min(), rdf.max()]

            rng = []
            if rrng[0] < drng[0]:
                rng.append(rrng[0])
            else:
                rng.append(drng[0])

            if rrng[1] < drng[1]:
                rng.append(drng[1])
            else:
                rng.append(rrng[1])

            # compute the histograms
            dhist = histogram(df, rng, bins=bins)

            if rel_sg is not None:
                rhist = histogram(rdf, rng, bins=bins)
            else:
                rhist = [None, None]

            self.result[tk][h] = {
                "abs": dhist[1],
                "rel": rhist[1],
                "rng": dhist[0],
                "dig": dhist[2],
            }

            if ntype == "callsite":
                _data = df.to_numpy()
            elif ntype == "module":
                _data = df.groupby(["rank"]).mean().to_numpy()
            else:
                assert False

            self.result[tk]["d"] = _data

    def unpack(self):
        """
        Unpack the data into JSON-supported format.

        :return: (JSON)
        """
        result = {}
        for metric in TIME_COLUMNS:
            data = self.result[metric]
            result[metric] = {}
            for histo_type in self.histo_types:
                result[metric][histo_type] = {
                    "x": data[histo_type]["rng"].tolist(),
                    "y": data[histo_type]["abs"].tolist(),
                    "x_min": float(data[histo_type]["rng"][0]),
                    "x_max": float(data[histo_type]["rng"][-1]),
                    "y_min": float(data[histo_type]["abs"].min()),
                    "y_max": float(data[histo_type]["abs"].max()),
                    "dig": Histogram._get_digs_as_dict_array(data[histo_type]["dig"]),
                }
                if (
                    "rel" in data[histo_type].keys()
                    and data[histo_type]["rel"] is not None
                ):
                    result[metric][histo_type]["rel_y"] = data[histo_type][
                        "rel"
                    ].tolist()
                    result[metric][histo_type]["rel_y_min"] = data[histo_type][
                        "rel"
                    ].min()
                    result[metric][histo_type]["rel_y_max"] = data[histo_type][
                        "rel"
                    ].max()

                result[metric]["d"] = data["d"].tolist()

        return result

    def _get_digs_as_dict_array(arr):
        ret = {}
        for x in zip(iter(arr), range(0, len(arr))):
            bin_idx = int(x[0]) - 1
            if bin_idx not in ret:
                ret[bin_idx] = []

            ret[bin_idx].append(int(x[1]))
        return ret

    # --------------------------------------------------------------------------
    def _get_data_by_histo_type(self, df, histo_type):
        """
        Compute data based on the requested histo_type (e.g., rank, dataset, name).

        :param df: (pandas.DataFrame) df
        :param histo_type: (str) histogram type to work with
        :return: (np.array) data for the histogram computation based on the histo_type
        """
        assert isinstance(df, pd.DataFrame)
        if histo_type == "dataset":
            assert "dataset" in df.columns
        ndatasets = df_count(df, "dataset")
        nranks = df_count(df, "rank")

        # across rank case
        if histo_type == "rank":
            if ndatasets > 0:  # ensemble case
                return df
            elif ndatasets == 0 and nranks == 0:  # single case and single rank
                return df
            else:  # single case and multiple ranks
                _df = df.groupby(["rank"])

        # otherwise, group by the type
        else:
            _df = df.groupby([histo_type])

        # confused about this
        return _df[self.time_columns].mean()

    @staticmethod
    def _format_data(histo):
        """
        Format data according to the desired format.

        :param histo: Histogram data (computed by utils.histogram).
        :return: Dict ({
            "b": bins, (x-axis)
            "h" histograms, (y-axis)
            "dig": digitized information on where the bin values are located. (used by rankLines).
        })
        """
        return {"b": histo[0], "h": histo[1], "dig": histo[2]}


# ------------------------------------------------------------------------------
