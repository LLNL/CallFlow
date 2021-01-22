# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT
# ------------------------------------------------------------------------------

import numpy as np
import pandas as pd


# ------------------------------------------------------------------------------
# pandas dataframe utils
# ------------------------------------------------------------------------------
def df_unique(df, column, proxy={}):
    column = proxy.get(column, column)
    return df[column].unique()


def df_count(df, column, proxy={}):
    column = proxy.get(column, column)
    return len(df_unique(df, column))


def df_minmax(df, column, proxy={}):
    column = proxy.get(column, column)
    return df[column].min(), df[column].max()


# ------------------------------------------------------------------------------
def df_get_column(df, column, index="name", proxy={}):
    column = proxy.get(column, column)
    return df.set_index(index)[column]


# ------------------------------------------------------------------------------
def df_filter_by_value(df, column, value, index="name", proxy={}):
    assert isinstance(value, (int, float))
    column = proxy.get(column, column)
    df = df.loc[df[column] > value]
    mask = df[index].isin(df[index].unique())
    return df[mask]


def df_filter_by_list(df, column, values, proxy={}):
    assert isinstance(values, list)
    column = proxy.get(column, column)
    mask = df[column].isin(values)
    return df[mask]


def df_filter_by_search_string(df, column, search_strings, proxy={}):
    column = proxy.get(column, column)
    unq, ids = np.unique(df[column], return_inverse=True)
    unq_ids = np.searchsorted(unq, search_strings)
    mask = np.isin(ids, unq_ids)
    return df[mask]


# ------------------------------------------------------------------------------
def df_lookup_by_column(df, column, value, proxy={}):
    column = proxy.get(column, column)
    return df.loc[df[column] == value]


def df_lookup_and_list(df, col_lookup, val_lookup, col_list, proxy={}):
    col_lookup = proxy.get(col_lookup, col_lookup)
    col_list = proxy.get(col_list, col_list)
    return df_unique(df_lookup_by_column(df, col_lookup, val_lookup), col_list)


# ------------------------------------------------------------------------------
def df_group_by(df, columns, proxy={}):
    if isinstance(columns, list):
        columns = [proxy.get(_,_) for _ in columns]
        return df.groupby(columns)
    else:
        assert isinstance(columns, str)
        columns = proxy.get(columns, columns)
        return df.groupby([columns])


# ------------------------------------------------------------------------------
