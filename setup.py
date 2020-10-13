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
vfile = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     'callflow', 'version.py')
with open(vfile) as fp:
    exec(fp.read(), version)
version=version["__version__"]

# ------------------------------------------------------------------------------
# gather the data to be copied
def list_files(directory):
    paths = []
    for (path, directories, filenames) in os.walk(directory):
        files = [os.path.join(path, f) for f in filenames]
        paths.append((path, [os.path.join(path, f) for f in filenames]))
    return paths

data_files = list_files('data')
example_files = list_files('examples')


deps = ["flask_socketio", "ipython",
        "colorlog", "jsonschema",
        "numpy", "scipy", "pandas", "scikit_learn", "statsmodels",
        "hatchet", "networkx", "matplotlib"
        ]
# ------------------------------------------------------------------------------
# now set up
setup(name="CallFlow",
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
      data_files=data_files+example_files,
      entry_points={
        'console_scripts': [ 'callflow_server = server.callflow_server:main' ]
      },
      install_requires=deps
    )

# ------------------------------------------------------------------------------
