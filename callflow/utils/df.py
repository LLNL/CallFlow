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

def df_bi_level_group(df, frst_group_attr, scnd_group_attr, cols, apply_func, proxy={}):
    """
    """
    g_df = df.groupby(frst_group_attr)

    _cols = [proxy.get(_, _) for _ in cols]    
    ret_df = pd.DataFrame([])
    for grp in g_df.groups:
        _df = g_df.get_group(grp)
        if "dataset" in _df.columns:
            group_cols = ["dataset", scnd_group_attr]
        else:
            group_cols = [scnd_group_attr]
        ret_df = pd.concat([ret_df, _df.groupby(group_cols)[_cols].apply(apply_func)])
        
    ret_df["module"] = ret_df["module"].astype(int)
        
    ret_df.reset_index(drop=False, inplace=True)
    return ret_df


def df_bi_level_group_2(df, frst_group_attr, scnd_group_attr, apply_func, proxy={}):
    _df = df.set_index([frst_group_attr])
    if scnd_group_attr is not None:
        _df = df.set_index([frst_group_attr, scnd_group_attr])
    _levels = _df.index.unique().tolist()
    if scnd_group_attr is not None:
        return { _ : _df.xs(_).groupby("rank").mean() for (_, __) in _levels }
    else:
        return { _ : _df.xs(_).groupby("rank").mean() for _ in _levels }


def df_bi_level_group_3(df, frst_group_attr, scnd_group_attr, cols, group_by, apply_func, proxy={}):
    _df = df.set_index([frst_group_attr])
    _cols = [proxy.get(_, _) for _ in cols] + group_by

    # If there is only one attribute to group by, we use the 1st index.
    if len(group_by) == 1:
        group_by = group_by[0]

    if scnd_group_attr is not None:
        _indexes = [frst_group_attr, scnd_group_attr]
    else:
        _indexes = [frst_group_attr]

    _df = df.set_index(_indexes)
    _levels = _df.index.unique().tolist()
        
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