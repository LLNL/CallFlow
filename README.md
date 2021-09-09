# CallFlow

CallFlow is an interactive visual analysis tool that provides a high-level overview of CCTs together with semantic refinement operations to progressively explore the CCTs.

## Installation

CallFlow is structured as three components:

1. A Python package `callflow` that provides functionality to load and manipulate callgraphs.
2. A D3 based `app` for visualization.
3. A python `server` to support the visualization client.

#### Installing CallFlow

The `callflow` (python package) requires [python](https://realpython.com/installing-python/) (>= 3.6) and [pip](https://pip.pypa.io/en/stable/news/) (>= 20.1.1). Other dependencies are checked/installed during the installation of `callflow` using `setup.py`.

```
python3 setup.py install --prefix /PATH/TO/INSTALL
```

The installation places a binary, called `callflow` inside the
`/PATH/TO/INSTALL/bin`, which can be exported to the `$PATH` environment variable.

## Sample Data

Sample data and examples are provided in the [`data`](./data) and [`examples`](./examples) directories.

## Using CallFlow

The first step is to process the "raw datasets" (performance profiles) using `callflow`. The processing step typically entails some filtering and aggregation of data to produce the reduced graphs at desired granularity.

### Processing data

#### For single dataset:
`--process` argument processes of the datasets in the provided `--data_path` by
treating each dataset as an independent SuperGraph.

```
callflow --data_path /PATH/TO/DATA/DIRECTORY --process --profile_format {hpctoolkit,caliper_json,caliper}
```

#### For ensemble of datasets:
`--ensemble_process` argument processes the datasets in the provided
`--data_path` after unifying the individual SuperGraphs into an Ensemble SuperGraph.
```
callflow --data_path /PATH/TO/DATA/DIRECTORY --process --ensemble_process --profile_format {hpctoolkit,caliper_json,caliper}
```

#### For re-processing the datasets:
Once processed, CallFlow would warn the user that the datasets have been
processed already and subsequently load the processed datasets. 

To re-process the datasets, use --reset option (which will delete the exisiting
.callflow directory and redo the processing).

```
callflow --data_path /PATH/TO/DATA/DIRECTORY --process --reset --profile_format {hpctoolkit,caliper_json,caliper}
```

The processed data is placed inside `/PATH/TO/DATA/DIRECTORY/.callflow`. To modify the location of the processed data, use the `--save_path` argument.

The parameters of the processing step can be either passed in as arguments to the command line or modified through the config file. To process using the `config.json`,

```
callflow --config /PATH/TO/CONFIG_FILE --process
```

### Running the server

##### via `--data_path` option,
```
callflow --data_path /PATH/TO/DATA/DIRECTORY --profile_format {hpctoolkit,caliper_json,caliper}
```

##### via `--config` option,
```
callflow --config /PATH/TO/CONFIG_FILE --profile_format {hpctoolkit,caliper_json,caliper}
```

By default, the application runs on port `5000`. To use a different port, please set the environment variable.
```
export CALLFLOW_APP_PORT=<port_number>
```

## Contribution and Development

The callflow `app` requires [node.js](https://nodejs.org/en/download/) (>= 13.7.0) and `npm` (>= 6.13.7). If there is an older version of `node` installed, install [nvm](https://github.com/nvm-sh/nvm) and use the following command to change version.
`nvm use 13.7.0`

The `app` and its dependencies can be installed as follows.

```
cd app
npm install
```

To start the `app`,

```
npm run serve
```

To build the `app`,
```
npm run build
sh update_build.sh
```

The basic architecture diagram can be found [here](/docs/figures/CallFlow-basic-architecture.png).

## CallFlow Citations

Any published work that utilizes this software should include the following references:


For Callflow v1.1 that supports comparative visualization (ensembles of callgraphs), cite:

- Suraj P. Kesavan, Harsh Bhatia, Abhinav Bhatele, Todd Gamblin, Peer-Timo Bremer, Kwan-Liu Ma. **Scalable Comparative Visualization of Ensembles of Call Graphs.** [arXiv:2007.01395](https://arxiv.org/abs/2007.01395).

For CallFlow 1.0 that supports a single callgraph, cite:

- Huu Tan Nguyen, Abhinav Bhatele, Nikhil Jain, Suraj P. Kesavan, Harsh Bhatia, Todd Gamblin, Kwan-Liu Ma, Peer-Timo Bremer. **Visualizing Hierarchical Performance Profiles of Parallel Codes using CallFlow.** _IEEE Transactions on Visualization and Computer Graphics_, 2019. doi:[10.1109/TVCG.2019.2953746](https://ieeexplore.ieee.org/document/8901998).

## License and Copyright

CallFlow is released under MIT license. See the LICENSE file for details.
`LLNL-CODE-740862`.

Developed by Suraj P. Kesavan (<spkesavan@ucdavis.edu>), with contributions from Harsh Bhatia (<hbhatia@llnl.gov>).

Copyright (c) 2021, Lawrence Livermore National Security, LLC.
Produced at the Lawrence Livermore National Laboratory. All rights reserved.
