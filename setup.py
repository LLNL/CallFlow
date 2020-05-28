# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# Hatchet Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

from setuptools import setup
from codecs import open
from os import path

__version_info__ = ("0", "0", "1")
__version__ = ".".join(__version_info__)

here = path.abspath(path.dirname(__file__))

setup(
    name="CallFlow",
    version=__version__,
    description="",
    url="https://github.com/LLNL/CallFlow",
    author="Suraj Kesavan",
    author_email="spkesavan@ucdavis.edu",
    license="MIT",
    classifiers=[
        "Development Status :: 1 - Planning",
        "License :: OSI Approved :: MIT License",
    ],
    keywords="",
    packages=[
        "callflow",
        "callflow.server",
        "callflow.pipeline",
        "callflow.ensemble",
        "callflow.ensemble.actions",
        "callflow.single",
        "callflow.single.actions",
        "callflow.utils",
        "callflow.algorithm",
    ],
    install_requires=[
        "pandas",
        "networkx == 2.2",
        "numpy",
        "flask",
        "flask_socketio",
        "sklearn",
        "hatchet",
    ],
)
