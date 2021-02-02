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
python3 setup.py install --prefix PATH/TO/INSTALL
```

The installation places a binary, called `callflow` inside the
/PATH/TO/INSTALL/bin, which can exported to the $PATH environment variable.

## Sample Data

Sample data and examples are provided in the [`data`](./data) and [`examples`](./examples) directories.

## Using CallFlow

The first step is to process the raw datasets using `callflow`. The processing step typically entails some filtering and aggregation of data to produce the reduced graphs at desired granularity. 
### Processing data

```
callflow --data-dir {/PATH/TO/DATA/DIRECTORY} --process --profile_format {hpctoolkit,caliper_json,caliper}
```

The processed data resides inside a `.callflow` directory created
inside the /PATH/TO/DATA/DIRECTORY. To modify the `.callflow` location, use the `--save_path` argument.

The parameters of the processing step can be either passed in as arguments to
the command line or modified using the config file, `.callflow/config.json`. 

To process using the `config.json`,

```
callflow --config {/PATH/TO/CONFIG} --process
```

### Running the server

via `--data-dir` option,
```
callflow --data-dir {PATH_TO_DATA_DIRECTORY} --profile_format
```

via `--config` option,
```
callflow --config {PATH_TO_CONFIG} --profile_format
```

By default, the application would run on port, 5000. If the port needs to be changed, please set the environment variables using,

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

Written by Suraj P. Kesavan (<spkesavan@ucdavis.edu>) and Harsh Bhatia (<bhatia4@llnl.gov>).

Copyright (c) 2021, Lawrence Livermore National Security, LLC.
Produced at the Lawrence Livermore National Laboratory. All rights reserved.
