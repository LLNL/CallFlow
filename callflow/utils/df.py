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
def df_info(df):
    return f'{df.shape} {list(df.index.names)} {list(df.columns)}'


def df_unique(df, column, proxy={}):
    column = proxy.get(column, column)
    if column not in df.columns:
        return np.array([])
    return df[column].unique()


def df_count(df, column, proxy={}):
    return len(df_unique(df, column, proxy))


def df_minmax(df, column, proxy={}):
    column = proxy.get(column, column)
    return df[column].min(), df[column].max()


# ------------------------------------------------------------------------------
def df_columns(df):
    return df.columns


def df_get_column(df, column, index="name", proxy={}):
    column = proxy.get(column, column)
    return df.set_index(index)[column]


def df_fetch_columns(df, columns, proxy={}):
    columns = [proxy.get(_, _) for _ in columns]
    return df[columns]


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
def df_as_dict(df, from_col, to_col):
    assert isinstance(df, pd.DataFrame)
    assert isinstance(from_col, str) and isinstance(to_col, str)
    df = df[[from_col, to_col]]
    df.set_index(from_col, inplace=True)
    df = df[~df.index.duplicated(keep='first')]
    return df.to_dict()[to_col]


def df_lookup_by_column(df, column, value, proxy={}):
    column = proxy.get(column, column)
    return df.loc[df[column] == value]


def df_lookup_and_list(df, col_lookup, val_lookup, col_list, proxy={}):
    col_lookup = proxy.get(col_lookup, col_lookup)
    col_list = proxy.get(col_list, col_list)
    return np.array(list(set(df_lookup_by_column(df, col_lookup, val_lookup)[col_list].values)))


# ------------------------------------------------------------------------------
def df_group_by(df, columns, proxy={}):
    if isinstance(columns, list):
        columns = [proxy.get(_, _) for _ in columns]
        return df.groupby(columns)
    else:
        assert isinstance(columns, str)
        columns = proxy.get(columns, columns)
        return df.groupby([columns])

# TODO: Generalize to apply_func. 
# Performs a 2-level grouping based on frst_group_attr and scnd_group_attr. 
# Example use case:
#   Group the dataframe by "module" and "name".
# Returns a dict 
def df_bi_level_group(df, frst_group_attr, scnd_group_attr, cols, group_by, apply_func, proxy={}):
    _cols = [proxy.get(_, _) for _ in cols] + group_by

    # If there is only one attribute to group by, we use the 1st index.
    if len(group_by) == 1:
        group_by = group_by[0]

    # Find the grouping
    if scnd_group_attr is not None:
        _groups = [frst_group_attr, scnd_group_attr]
    else:
        _groups = [frst_group_attr]

    # Set the df.index as the _groups
    _df = df.set_index(_groups)
    _levels = _df.index.unique().tolist()
        
    # If "rank" is present in the columns, we will group by "rank".
    if "rank" in _df.columns and len(df["rank"].unique().tolist()) > 1:
        if scnd_group_attr is not None:
            if len(group_by) == 0:
                _cols = _cols + ["rank"]
                return { _ : _df.xs(_)[_cols] for (_, __) in _levels }
            return { _ : (_df.xs(_)[_cols].groupby(group_by).mean()).reset_index() for (_, __) in _levels }
        else:
            if len(group_by) == 0:
                _cols = _cols + ["rank"]
                return { _ : _df.xs(_)[_cols] for _ in _levels }
            return { _ : (_df.xs(_)[_cols].groupby(group_by).mean()).reset_index() for _ in _levels }
    else: 
        return { _ : _df.xs(_)[_cols] for _ in _levels}