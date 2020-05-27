CallFlow
============

CallFlow is an interactive visual analysis tool that provides a high-level overview of CCTs together with semantic refinement operations to progressively explore the
CCTs.

# Requirements
- Install [python](https://realpython.com/installing-python/) (>= 3.6) and [pip](https://pip.pypa.io/en/stable/news/) (>= 20.1.1)

- Install [Hatchet](https://github.com/LLNL/hatchet) using pip
	```
	pip install hatchet
	```

- Install [node.js](https://nodejs.org/en/download/) (>= 13.7.0) and `npm` (>= 6.13.7)

- If there is an older version of `node` installed, install [nvm](https://github.com/nvm-sh/nvm) and use the following command to change version.
	```
	nvm use 13.7.0
	```


# Installation
 ```
pip install .
```
 
 For the web app, install the required packages.

 ## App server
```
cd app
npm install
```

# Preparing Data.

Callflow currently, supports two formats, [hpctoolkit](http://hpctoolkit.org/) and [caliper](www.github.com/LLNL/caliper). Sample datasets can be found in the `data` folder. Please make sure the directory structure is as given below.

## HPCToolkit
```
{$CALLFLOW_PATH}/data/{hpctoolkit_dataset}
	.../experiment.xml
	.../experiment-001.metric-db
	.../experiment-002.metric-db
	.../experiment-003.metric-db
	...
```

## Caliper	

```
{$CALLFLOW_PATH}/data/{caliper_dataset}
	.../data/experiment.json

```

# Configuration file.
CallFlow requires the user to specify how various data preprocessing operations are performed (i.e., filtering, grouping operations) using a scheme. We recommend naming the configuration file with the `.callflow.json` file extension.

```
{
    "run_name": "{run_name}", // Name of the experiment. 
    "save_path": "{data/run_name/.callflow}", // File path to save callflow generated files.
    "datasets": [
        {
            "name": "dataset-1", // name of dataset
            "path": "data/run_name/dataset_1}", // path to dataset 1
            "format": "{profile_format}" // HPCToolkit|Caliper
        },
		{
			"name": "dataset-1", // name of dataset
            "path": "data/run_name/dataset_1}", // path to dataset 1
            "format": "{profile_format}" // HPCToolkit|Caliper
		}, 
		...
    ],
    "scheme": {
        "filter_by": "{filter_metric", // time (inc)|time
        "filter_perc": "{filter_percentage}",
        "group_by": "{group_metric", // name for CallGraph and module for SuperGraph.
        "module_map": {
            "module-1": [
                "callsite-1",
                "callsite-2",
				...
            ],
			"module-2": [
				...
			],
			...
			"module-n": [
				...
			]

        },
    }
}
```


# Running

To process the datasets,
```
cd callflow/server
python3 app.py --config {config_file_path} --process
```

To run the server,

```
cd callflow/server
python3 app.py --config {config_file_path} 
```


To run the web app server,

```
cd app
npm run dev
```

# Reference

Any published work that utilizes this software should include the following references:

* Huu Tan Nguyen, Abhinav Bhatele, Nikhil Jain, Suraj P. Kesavan, Harsh Bhatia, Todd Gamblin, Kwan-Liu Ma, Peer-Timo Bremer. Visualizing Hierarchical Performance Profiles of Parallel Codes using CallFlow. In Proceedings of the IEEE Transactions on Visualization and Computer Graphics, 2019. LLNL-JRNL-797378. DOI:10.1109/TVCG.2019.2953746

# Copyright

Copyright (c) 2019, Lawrence Livermore National Security, LLC.
Produced at the Lawrence Livermore National Laboratory.

Written by Huu Tan Nguyen (<htpnguyen@ucdavis.edu>), Suraj Kesavan (<spkesavan@ucdavis.edu>).

LLNL-CODE-740862. All rights reserved.