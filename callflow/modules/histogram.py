# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

"""
CallFlow's operation to calculate the rank and dataset histograms.
"""
import numpy as np
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

    def __init__(self, df, relative_to_df=None, bins=20,
                 histo_types = [], node_type="", proxy_columns={}):
        """

        :param df: (Pandas.dataframe) dataframe from the target dataset
        :param relative_to_df: (Pandas.dataframe) dataframe from the background dataset
        :param histo_types: (list) Histogram types (e.g., name, rank, and dataset)
        :param bins: (int) Number of bins in the histogram
        :param node_type: (str) Node's type (e.g., callsite or module)
        :param proxy_columns: (dict) Proxies for the column names.
        """
        assert isinstance(df, pd.DataFrame)
        if relative_to_df is not None:
            assert isinstance(relative_to_df, pd.DataFrame)
        assert isinstance(bins, int)
        assert isinstance(proxy_columns, dict)
        assert isinstance(histo_types, list)
        assert bins > 0
        assert node_type in ['callsite', 'module']

        self.time_columns = [proxy_columns.get(_, _) for _ in TIME_COLUMNS]
        self.result = {_: {} for _ in TIME_COLUMNS}
        self.histo_types = histo_types

        if len(histo_types) == 0:
            histo_types = Histogram.HISTO_TYPES

        # for each type of histogram and each time column
        for h,(tk,tv) in itertools.product(histo_types, zip(TIME_COLUMNS, self.time_columns)):

            # compute the range of the actual data
            df = self._get_data_by_histo_type(df, h)[tv]
            drng = [df.min(), df.max()]

            # compute the range df relative to the provided relative_to_df.
            if relative_to_df is None:
                # Note: For single super graph, it will enter the `if` case;
                rrng = drng
            else:
                # Note: For ensemble super graph, we calculate relative to the
                # ensemble_df. 
                rdf = self._get_data_by_histo_type(relative_to_df, h)[tv]
                rrng = [rdf.min(), rdf.max()]
                # TODO: Why can't relative df's min or max go beyond the bound?
                # e.g., comparing two datasets. 
                # I think we should rather just consider the bounds to be more
                # flexible.
                #assert rrng[0] <= drng[0]
                #assert rrng[1] >= drng[1]
                if drng[0] < rrng[0] or drng[1] > rrng[1]:
                    LOGGER.error(list(df.to_numpy()))
                    LOGGER.error(list(rdf.to_numpy()))
                    LOGGER.error(f'Found incorrect ranges for hist=({h},{tk})'
                                 f' drng = {drng}, rrng = {rrng}')
                    assert False

            # compute the histograms
            hist = histogram(df, rrng, bins=bins)
            if relative_to_df is not None:
                hist = hist[1]              # dont's store the bins
            self.result[tk][h] = hist

            if node_type == "callsite":
                _data = df.to_numpy()
            elif node_type == "module":
                _data = df.groupby(["rank"]).mean().to_numpy()
            else:
                assert False

            self.result[tk]["d"] = _data

    def unpack(self):
        result = {}
        for metric in self.time_columns:
            data = self.result[metric]
            result[metric] = {}
            for histo_type in self.histo_types:
                result[metric][histo_type] = {
                    "x": data[histo_type][0].tolist(),
                    "y": data[histo_type][1].tolist(),
                    "x_min": float(data[histo_type][0][0]),
                    "x_max": float(data[histo_type][0][-1]),
                    "y_min": float(data[histo_type][1].min()),
                    "y_max": float(data[histo_type][1].max()),
                }
                result[metric]["d"] = data["d"].tolist()
        
        return result

    # --------------------------------------------------------------------------
    # Return the histogram in the required form.
    def _get_data_by_histo_type(self, df, histo_type):
        """

        :param data:
        :param prop:
        :return:
        """
        ndatasets = df_count(df, 'dataset')
        nranks = df_count(df, 'rank')

        # across rank case
        if histo_type == "rank":
            if ndatasets > 0:                    # ensemble case
                return df
            elif ndatasets == 0 and nranks == 0: # single case and single rank
                return df
            else:                            # single case and multiple ranks
                _df = df.groupby(["rank"])

        # TODO: check with Suraj reg this
        # otherwise, group by the type
        else:
            # return df
            _df = df.groupby([histo_type])

        # confused about this
        return _df[self.time_columns].mean()

    @staticmethod
    def _format_data(histo):
        """

        :param histo:
        :return:
        """
        return {"b": histo[0], "h": histo[1]}

# ------------------------------------------------------------------------------
