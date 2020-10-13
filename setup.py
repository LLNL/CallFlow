# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# CallFlow Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

from setuptools import setup, find_packages

# get the version safely!
from codecs import open
version = {}
with open("./callflow/version.py") as fp:
    exec(fp.read(), version)
version=version["__version__"]

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
    install_requires=[
        "colorlog",
        "numpy",
        "pandas",
        "tables",
        "hatchet",
        "sklearn",
        "statsmodels",
        "networkx == 2.2",
        "ipython",
        "flask",
        "flask_socketio",
    ],
)
