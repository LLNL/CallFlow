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
    Calculate Histogram (Per rank, All ranks, Per dataset)
    """

    HISTO_TYPES = ["rank"]#, "name", "dataset"]

    def __init__(self, dataframe, relative_to_df=None, bins=20,
                 histo_types = [], proxy_columns={}):
        """

        :param dataframe:
        :param histo_types:
        :param bins:
        :param proxy_columns:
        """
        assert isinstance(dataframe, pd.DataFrame)
        if relative_to_df is not None:
            assert isinstance(relative_to_df, pd.DataFrame)
        assert isinstance(bins, int)
        assert isinstance(proxy_columns, dict)
        assert isinstance(histo_types, list)
        assert bins > 0

        self.time_columns = [proxy_columns.get(_, _) for _ in TIME_COLUMNS]
        self.result = {_: {} for _ in TIME_COLUMNS}

        if len(histo_types) == 0:
            histo_types = Histogram.HISTO_TYPES

        # for each type of histogram and each time column
        for h,(tk,tv) in itertools.product(histo_types, zip(TIME_COLUMNS, self.time_columns)):

            # compute the range of the actual data
            df = self._get_data_by_histo_type(dataframe, h)[tv]
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

    def unpack(self, hists, metric):
        data = hists[metric]
        result = {}
        for histo_type in data.keys():
            result[histo_type] = {
                "x": data[histo_type][0].tolist(),
                "y": data[histo_type][1].tolist(),
                "x_min": float(data[histo_type][0][0]),
                "x_max": float(data[histo_type][0][-1]),
                "y_min": float(data[histo_type][1].min()),
                "y_max": float(data[histo_type][1].max()),
            }
        
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
