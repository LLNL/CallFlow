# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import os
from setuptools import setup, find_packages
import pathlib

here = pathlib.Path(__file__).parent.resolve()

# Get the long description from the README file
long_description = (here / 'README.md').read_text(encoding='utf-8')

# ------------------------------------------------------------------------------
# get the version safely!
from codecs import open

version = {}
vfile = os.path.join(here, "callflow", "version.py")
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

_APP_DIST_FOLDERS = [
    "js",
    "css",
    "fonts",
    "index.html"
]

# # gather the data to be copied
# def list_files(directory, whitelist_files=[], whitelist_folders=[]):
#     paths = []
#     if len(whitelist_folders) > 0:
#         for item in os.listdir(directory):
#             if item in whitelist_folders:
#                 for (path, directories, filenames) in os.walk(
#                     os.path.join(directory, item)
#                 ):
#                     if ".callflow" not in path.split("/"):
#                         paths.append((path, [os.path.join(path, f) for f in filenames]))

#     if len(whitelist_files) > 0:
#         for (path, directories, filenames) in os.walk(directory):
#             paths.append(
#                 (
#                     path,
#                     [os.path.join(path, f) for f in filenames if f in whitelist_files],
#                 )
#             )
#     return paths

# gather the data to be copied
def list_files_update(directory, whitelist_files=[], whitelist_folders=[]):
    paths = []
    if len(whitelist_folders) > 0:
        for item in os.listdir(directory):
            if item in whitelist_folders:
                for (path, directories, filenames) in os.walk(
                    os.path.join(directory, item)
                ):
                    if ".callflow" not in path.split("/"):
                        paths = [os.path.join(path, f) for f in filenames]

    if len(whitelist_files) > 0:
        for (path, directories, filenames) in os.walk(directory):
            paths = [os.path.join(path, f) for f in filenames if f in whitelist_files]
    return paths


data_files = list_files_update("data", whitelist_folders=_GITHUB_DATA_FOLDERS)
example_files = list_files_update("examples", whitelist_files=_GITHUB_EXAMPLE_FILES)
app_dist_files = list_files_update("app/dist", whitelist_folders=_APP_DIST_FOLDERS)

# ------------------------------------------------------------------------------
# these folders live outside the callflow "package" in the src distribution
# but we want to install them within the callflow installed package
# i.e., in .../site-packages/callflow/app
# so, let's create a symlink inside the callflow folder
# so setuptools can place them relative to the installed package
if True:
    os.chdir('./callflow')
    for _ in ['data', 'app', 'examples']:
        if not os.path.islink(_):
            os.symlink(os.path.join('..', _), _)
    os.chdir('..')

# ------------------------------------------------------------------------------
deps = [
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
    description=long_description,
    url="https://github.com/LLNL/CallFlow",
    author="Suraj Kesavan",
    author_email="spkesavan@ucdavis.edu",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "License :: OSI Approved :: MIT License",
    ],
    keywords="",
    packages=find_packages(),
    include_package_data=True,
    package_data={'callflow': data_files + example_files + app_dist_files},
    entry_points={
        "console_scripts": [
            "callflow_server = callflow.server.callflow_server:main",
        ]
    },
    install_requires=deps,
)
# ------------------------------------------------------------------------------
