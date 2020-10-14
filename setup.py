# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import os
from setuptools import setup, find_packages

# ------------------------------------------------------------------------------
# get the version safely!
from codecs import open

version = {}
vfile = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "callflow", "version.py"
)
with open(vfile) as fp:
    exec(fp.read(), version)
version = version["__version__"]


# ------------------------------------------------------------------------------
# Only allow folders in https://github.com/LLNL/CallFlow/tree/develop/data to be added.
# For now we are hard-coding this.
# TODO: Find a more automated solution.
_GITHUB_DATA_FOLDERS = [
    "caliper-cali",
    "caliper-lulesh-json",
    "hpctoolkit-cpi-database",
]

# Only allow jupyter notebooks in https://github.com/LLNL/CallFlow/tree/develop/example to be added.
_GITHUB_EXAMPLE_FILES = [
    "%callflow-ipython-magic.ipynb",
    "CallFlow-python-interface-demo.ipynb",
]


# gather the data to be copied
def list_files(directory, whitelist_files=[], whitelist_folders=[]):
    paths = []
    if len(whitelist_folders) > 0:
        for item in os.listdir(directory):
            if item in whitelist_folders:
                for (path, directories, filenames) in os.walk(
                    os.path.join(directory, item)
                ):
                    if ".callflow" not in path.split("/"):
                        paths.append((path, [os.path.join(path, f) for f in filenames]))

    if len(whitelist_files) > 0:
        for (path, directories, filenames) in os.walk(directory):
            paths.append(
                (
                    path,
                    [os.path.join(path, f) for f in filenames if f in whitelist_files],
                )
            )
    return paths


data_files = list_files("data", whitelist_folders=_GITHUB_DATA_FOLDERS)
example_files = list_files("examples", whitelist_files=_GITHUB_EXAMPLE_FILES)


deps = [
    "flask_socketio",
    "ipython",
    "colorlog",
    "jsonschema",
    "numpy",
    "scipy",
    "pandas",
    "scikit_learn",
    "statsmodels",
    "hatchet",
    "networkx",
    "matplotlib",
]
# ------------------------------------------------------------------------------
# now set up
setup(
    name="CallFlow",
    version=version,
    license="MIT",
    description="",
    url="https://github.com/LLNL/CallFlow",
    author="Suraj Kesavan",
    author_email="spkesavan@ucdavis.edu",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "License :: OSI Approved :: MIT License",
    ],
    keywords="",
    packages=find_packages(),
    data_files=data_files + example_files,
    entry_points={"console_scripts": ["callflow_server = server.callflow_server:main"]},
    install_requires=deps,
)

# ------------------------------------------------------------------------------
