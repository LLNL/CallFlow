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
python3 setup.py install
```

## Sample Data

Sample data and examples are provided in the [`data`](./data) and [`examples`](./examples) directories.

## Using CallFlow

The first step is to process the raw datasets to use with CallFlow. This preprocessing typically entails some filtering and aggregation of data to produce the reduced graphs at desired granularity. The parameters of the preprocessing are provided through a config file (see examples of config files in the sample data directories).

The processing of profiles generates a `.callflow` directory in the ${save_path}, which is provided either in the `callflow.config.json` or --save_path attribute. If not provided, the `.callflow` directory will be placed in the data folder.

### Running the server

```
python3 callflow/server/callflow_server.py --data-dir {PATH_TO_DATA_DIRECTORY}
```

Finally, the web application server can be run using
```
callflow_app
```

By default, the application would run on port, 8000. If the port needs to be changed, please set the environment variables using,

```
export CALLFLOW_SERVER_PORT=<port_number>
export CALLFLOW_APP_PORT=<port_number>
```

#### Contribution and Development

The callflow `app` requires [node.js](https://nodejs.org/en/download/) (>= 13.7.0) and `npm` (>= 6.13.7). If there is an older version of `node` installed, install [nvm](https://github.com/nvm-sh/nvm) and use the following command to change version.
`nvm use 13.7.0`

The `app` and its dependencies can be installed as follows.

```
cd app
npm install
```

To start the `app`,

```
npm run dev
```

The basic architecture diagram can be found [here](/docs/figures/CallFlow-basic-architecture.png).

## CallFlow Citations

Any published work that utilizes this software should include the following references:

For CallFlow 1.0 that supports a single callgraph, cite:

- Huu Tan Nguyen, Abhinav Bhatele, Nikhil Jain, Suraj P. Kesavan, Harsh Bhatia, Todd Gamblin, Kwan-Liu Ma, Peer-Timo Bremer. **Visualizing Hierarchical Performance Profiles of Parallel Codes using CallFlow.** _IEEE Transactions on Visualization and Computer Graphics_, 2019. doi:[10.1109/TVCG.2019.2953746](https://ieeexplore.ieee.org/document/8901998).

For Callflow v1.1 that supports comparative visualization (ensembles of callgraphs), cite:

- Suraj P. Kesavan, Harsh Bhatia, Abhinav Bhatele, Todd Gamblin, Peer-Timo Bremer, Kwan-Liu Ma. **Scalable Comparative Visualization of Ensembles of Call Graphs.** [arXiv:2007.01395](https://arxiv.org/abs/2007.01395).

## License and Copyright

CallFlow is released under MIT license. See the LICENSE file for details.
`LLNL-CODE-740862`.

Written by Suraj P. Kesavan (<spkesavan@ucdavis.edu>) and Huu Tan Nguyen (<htpnguyen@ucdavis.edu>).

Copyright (c) 2020, Lawrence Livermore National Security, LLC.
Produced at the Lawrence Livermore National Laboratory. All rights reserved.
