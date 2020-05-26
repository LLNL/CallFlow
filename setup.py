# Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
# Hatchet Project Developers. See the top-level LICENSE file for details.
#
# SPDX-License-Identifier: MIT

from setuptools import setup
from codecs import open
from os import path
from CallFlow import __version__

here = path.abspath(path.dirname(__file__))

# Get the long description from the README file
with open(path.join(here, "README.md"), encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="CallFlow",
    version=__version__,
    description="",
    url="https://github.com/LLNL/CallFlow",
    author="Suraj Kesavan",
    author_email="bhatele@cs.umd.edu",
    license="MIT",
    classifiers=[
        "Development Status :: 1 - Planning",
        "License :: OSI Approved :: MIT License",
    ],
    keywords="",
    packages=[
        "CallFlow",
        "CallFlow.server",
        "CallFlow.server.pipeline",
        "CallFlow.server.ensemble",
        "CallFlow.server.single",
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
