# Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

import os
from setuptools import setup, find_packages
import pathlib

# get the version safely!
from codecs import open

here = pathlib.Path(__file__).parent.resolve()

# Get the long description from the README file
long_description = (here / "README.md").read_text(encoding="utf-8")

# ------------------------------------------------------------------------------
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
    "hpctoolkit-cpi-databases",
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
]

_APP_DIST_INDEX_HTML = ["index.html"]


def list_files_update(directory, whitelist_files=[], whitelist_folders=[]):
    """
    Returns the paths of all children files after checking it with the
    whitelisted folders or files.
    directory: Path to iterate
    whitelist_files: Array(files to only consider)
    whitelist_folders: Array(folders to only consider)
    """
    paths = []
    if len(whitelist_folders) > 0:
        for item in os.listdir(directory):
            if item in whitelist_folders:
                for (path, directories, filenames) in os.walk(
                    os.path.join(directory, item)
                ):
                    if ".callflow" not in path.split("/"):
                        paths += [os.path.join(path, f) for f in filenames]

    if len(whitelist_files) > 0:
        for (path, directories, filenames) in os.walk(directory):
            paths += [os.path.join(path, f) for f in filenames if f in whitelist_files]

    return paths


data_files = list_files_update("data", whitelist_folders=_GITHUB_DATA_FOLDERS)
example_files = list_files_update("examples", whitelist_files=_GITHUB_EXAMPLE_FILES)
app_dist_folders = list_files_update("app/dist", whitelist_folders=_APP_DIST_FOLDERS)
app_dist_index_html = list_files_update(
    "app/dist", whitelist_files=_APP_DIST_INDEX_HTML
)

# ------------------------------------------------------------------------------
# these folders live outside the callflow "package" in the src distribution
# but we want to install them within the callflow installed package
# i.e., in .../site-packages/callflow/app
# so, let's create a symlink inside the callflow folder
# so setuptools can place them relative to the installed package
os.chdir("./callflow")
for _ in ["app", "data", "examples"]:

    if not os.path.islink(_):
        os.symlink(os.path.join("..", _), _)
os.chdir("..")

# ------------------------------------------------------------------------------
deps = [
    "numpy",
    "scipy",
    "pandas",
    "llnl-hatchet",
    "scikit_learn",
    "colorlog",
    "jsonschema",
    "networkx",
    "matplotlib",
    "ipython",
    "flask_cors",
    "pyinstrument",
    "psutil",
]

# ------------------------------------------------------------------------------
# now set up
setup(
    name="CallFlow",
    version=version,
    license="MIT",
    description="An Interactive Visual Analysis Tool for visualizing Calling Context Trees, Call Graphs from Performance Profiles.",
    long_description=long_description,
    long_description_content_type="text/markdown",
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
    zip_safe=False,
    package_data={
        "callflow": data_files + example_files + app_dist_folders + app_dist_index_html
    },
    entry_points={"console_scripts": ["callflow = server.main:main"]},
    install_requires=deps,
)
# ------------------------------------------------------------------------------
