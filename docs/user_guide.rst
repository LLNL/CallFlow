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


Sample Datasets
---------------

Sample data and examples are provided in the `data <https://github.com/LLNL/CallFlow/tree/develop/data>`_ and `examples <https://github.com/LLNL/CallFlow/tree/develop/examples>`_.


Arguments
---------

.. code-block:: console

   --verbose - Display debug points. 
   (optional, default: false) 

   --config - Config file to be processed.
   (Either config file or data directory must be provided)

   --data_dir - Input directory to be processed.
   (Either config file or data directory must be provided)

   --process - Enable process mode. 
   (default: false)

   --profile_format - Profile format.
   (required, either hpctoolkit | caliper | caliper_json)

   --save_path - Save path for the processed files. 
   (optional, default: data_dir/.callflow)

   --filter_by - Set filter by column 
   (optional, e.g., "time" or "time (inc)")

   --filter_perc - Set filter percentage. 
   (optional, e.g., 10, 20, 30)

   --group_by - Set the semantic level for supergraph  
   (optional, e.g., module to get super graph, name to get call graph, default: 'module')

   --read_parameter - Enable parameter analysis. 
   (optional. This is an experimental feature)

Process datasets
----------------
First step is to process the raw datasets to use with CallFlow. The processing can be done either by passing data directory (using --data_dir), or using `config.callflow.json` file (using --config).

1. Using the directory (i.e., --data_dir).

The user can input a directory of profiles of a "same" format for processing. 

.. code-block:: console

   $ python3 server/main.py --data_dir /path/to/dataset --profile_format hpctoolkit --process 

Note: The processing step typically entails some filtering and aggregation of data to produce the reduced graphs at desired granularity. To do this, the user can currently provide 3 arguments, namely --filter_by, --filter_perc, and --group_by.

2. Using the config file (i.e., --config).

The user can process profiles from different formats using the config file. The parameters of the preprocessing are provided through a config file (see examples of config files in the sample data directories). For example, the user can pass other arguments (e.g., save_path, filter_perc, etc.).

.. literalinclude:: examples/callflow.config.json
   :language: json
   :linenos:
   :emphasize-lines: 14
   :caption: Sample `callflow.config.json` to process 3 datasets

.. code-block:: console

   $ python3 server/main.py --config /path/to/config.callflow.json --process


Using CallFlow as a web app
---------------------------
To run CallFlow's web app, a python-based WSGI server (handles socket communication and processing of data) and a Vue client server need to be run simultaneously. 

1. Run the WSGI server. 

Note: Similar to the processing step, the web server can be run either using --config or --data_dir. 

.. code-block:: console

   $ python3 server/main.py --data_dir /path/to/dataset 

or 

.. code-block:: console

   $ python3 server/main.py --config /path/to/config.callflow.json

2. Run the client server.

.. code-block:: console

   $ cd app
   $ npm run dev

Using CallFlow inside Jupyter notebook environment
--------------------------------------------------
Use %callflow magic to run CallFlow in Jupyter notebook environment,

1. To load the callflow's magic extension, use the command %load_ext.

.. code-block:: console

   %load_ext callflow

2. Now, %callflow can be used to trigger the user interface like the command line.

.. code-block:: console

   %callflow --data_dir /path/to/directory --profile_format format 

or 

.. code-block:: console

   %callflow --config /path/to/config/file 


This feature will spawn the server and client in the background as child processes to Jupyter. It will also detect if any existing processes are in execution and attach seamlessly.

For reference, see `an example notebook <https://github.com/LLNL/CallFlow/blob/develop/examples/%25callflow-ipython-magic.ipynb>`_
