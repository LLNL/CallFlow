# *******************************************************************************
# * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
# * Produced at the Lawrence Livermore National Laboratory.
# *
# * Written by Suraj Kesavan <htpnguyen@ucdavis.edu>.
# *
# * LLNL-CODE-740862. All rights reserved.
# *
# * This file is part of CallFlow. For details, see:
# * https://github.com/LLNL/CallFlow
# * Please also read the LICENSE file for the MIT License notice.
# ******************************************************************************

from setuptools import setup, find_packages
from callflow import __version__

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
        "tables",
        "flask",
        "flask_socketio",
        "sklearn",
        "statsmodels",
        "networkx == 2.2",
        "hatchet",
    ],
)
