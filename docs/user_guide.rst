.. Copyright 2020 University of Maryland and other CallFlow Project Developers.
   See the top-level LICENSE file for details.

   SPDX-License-Identifier: MIT

**********
User Guide
**********

CallFlow is structured as three components:

1. A Python package callflow that provides functionality to load and manipulate callgraphs.
2. A D3 based app for visualization.
3. A python server to support the visualization client


Sample Data
-----------

Sample data and examples are provided in the `data <https://github.com/LLNL/CallFlow/tree/develop/data>`_ and `examples <https://github.com/LLNL/CallFlow/tree/develop/examples>`_.

Using CallFlow as a web app
---------------------------

The first step is to process the raw datasets to use with CallFlow. This preprocessing typically entails some filtering and aggregation of data to produce the reduced graphs at desired granularity. The parameters of the preprocessing are provided through a config file (see examples of config files in the sample data directories).

To process the datasets,

.. code-block:: console

   $ python3 server/main.py --config {config_file_path} --process

Next, the server can be run using the following command,

.. code-block:: console

   $ python3 server/main.py --config {config_file_path}

To start the app,

.. code-block:: console

   $ cd app
   $ npm run dev
