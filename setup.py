# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# Hatchet Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

from setuptools import setup, find_packages
from callflow import __version__

setup(
    name="CallFlow",
    version=__version__,
    license="MIT",
    description="",
    url="https://github.com/LLNL/CallFlow",
    author="Suraj Kesavan, Huu Tan Nguyen",
    author_email="spkesavan@ucdavis.edu",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "License :: OSI Approved :: MIT License",
    ],
    keywords="",
    packages=find_packages(),
    install_requires=[
        "numpy",
        "pandas",
        "tables",
        "flask",
        "flask_socketio",
        "sklearn",
        "statsmodels",
        "networkx == 2.2",
        "hatchet",
    ],
)
