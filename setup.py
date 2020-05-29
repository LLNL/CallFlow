# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# Hatchet Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

from setuptools import setup, find_packages

# ------------------------------------------------------------------------------
__version_info__ = ("0", "0", "1")
__version__ = ".".join(__version_info__)

# ------------------------------------------------------------------------------
setup(
    name="CallFlow",
    version=__version__,
    license="MIT",
    description="",
    url="https://github.com/LLNL/CallFlow",
    author="Suraj Kesavan",
    author_email="spkesavan@ucdavis.edu",
    classifiers=[
        "Development Status :: 1 - Planning",
        "License :: OSI Approved :: MIT License",
    ],
    keywords="",
    packages=find_packages(),
    install_requires=[
        "numpy",
        "pandas",
        "flask",
        "flask_socketio",
        "sklearn",
        "statsmodels",
        "networkx == 2.2",
        "hatchet",
    ],
)

# ------------------------------------------------------------------------------
