CallFlow v2.0b
==============

The hpctoolkit-parser has been replaced by [Hatchet](www.github.com/LLNL/hatchet) to support a standard API and work with many formats (like hpctoolkit, caliper, etc.). Hatchet analyzes performance data that is organized in a tree hierarchy (such as calling context trees, call graphs, nested regions' timers etc.).

For MacOS, create a .dot directory. 

```
    cd src/server/
    mkdir .callflow
    mkdir ./callflow/dataset
```

# Input

Callflow currently, supports two formats, hpctoolkit and [caliper](www.github.com/LLNL/caliper).

```
	hpctoolkit format
		  .../dataset/experiment.xml
	      .../dataset/experiment-001.metric-db
		  .../dataset/experiment-002.metric-db
		  .../dataset/experiment-003.metric-db
		  ......
		  
	caliper format:
		  .../dataset/experiment.json
```

# Contents of JSON file
To load multiiple datasets into Callflow, you need to provide a json file as input.  For examples, refer $CALLFLOW_PATH/config_files

```
{
    "datasets": [
        {
            "name": "Dataset1",
            "path": "./data/dataset/run1",
            "format": "hpctoolkit",
            "props": {
            },
            "nop": "128"
        },
        {
            "name": "Dataset2",
            "path": "./data/dataset/run2",
            "format": "hpctoolkit",
            "props": {
            },
            "nop": "128"
		},
		{
            "name": "Dataset3",
            "path": "./data/dataset/run3",
            "format": "hpctoolkit",
            "props": {
            },
            "nop": "128"
        }
    ]
}
```

# Install 

```
	cd src
	npm install
	bower install
	python setup.py install (TODO)
```

# Hatchet: 
In order to use Callflow, you need to clone [Hatchet](https://github.com/LLNL/hatchet/) into the src directory. 

``` 
	git clone https://github.com/LLNL/hatchet.git
```

Callflow uses the hatchet API to obtain the graphframe (which contains a graph and dataframe). 

``` 
	Graphframe : {
		graph: Linked list of nodes.
		dataframe: pandas dataframe that contains the performance metrics.
	}
```

# Running 
To run the client,

```
	cd src/public
	npm run dev
```
        
To run the server, 

```
	export PYTHONPATH=$CALLFLOW_PATH/src/hatchet
    cd src/server
	python3 app.py --config "Config file" --filter
```

--filter - filters the dataset by 
--filtertheta  - threshold by which the dataframes must be filtered. 
--filterBy - filter by an attirbute (or column) in the dataframe

Filtering the dataset reduces the number of nodes both hatchet and callflow has to process, and thereby increasing the response times. We suggest filtering by 0.01 percent of the inclusive/exclusive time of a node. 

The filtered dataset can also be stored to avoid the filter step on each run. (TODO: Find an intermediate format for interfacing hatchet and callflow)

Client side of Callflow uses Vue.js and is in ES6. 

# Reference

Any published work that utilizes this software should include the following
reference:

```
Huu Tan Nguyen, Abhinav Bhatele, Peer-Timo Bremer, Todd Gamblin, Martin Schulz,
Lai Wei, David Böhme, and Kwan-Liu Ma. VIPACT: A visualization interface for
analyzing calling context trees. In Proceedings of the 3rd Workshop on Visual
Performance Analysis, VPA '16, November 2016. LLNL-CONF-704659.
```

# Copyright

Copyright (c) 2018-2019, Lawrence Livermore National Security, LLC.
Produced at the Lawrence Livermore National Laboratory.

Written by:
```
    Huu Tan Nguyen <htpnguyen@ucdavis.edu>
    Suraj Kesavan <spkesavan@ucdavis.edu>.
```

LLNL-CODE-740862. All rights reserved.

