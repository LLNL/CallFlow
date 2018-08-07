CallFlow v2.0 (Dev)
============

The hpctoolkit-parser has been replace with [Hatchet](www.github.com/LLNL/hatchet) to support a standard API and work with many formats (like hpctoolkit, caliper, etc.). Hatchet analyzes performance data that is organized in a tree hierarchy (such as calling context trees, call graphs, nested regions' timers etc.).

### Input

Callflow currently, supports two formats, namely hpctoolkit and [caliper](www.github.com/LLNL/caliper).

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

### Install 

```
	npm install
	bower install
	python setup.py install (TODO)

```

### Hatchet format: 

Callflow uses the hatchet API to obtain the graphframe (which technically contains a graph and dataframe). 

``` 
	Graphframe : {
		graph: Linked list of nodes.
		dataframe: pandas dataframe that contains the performance metrics.
	}
```

### Running 
To run the server, 

```
	cd src/server
	python app.py --config-file "Config file" --filter
```

--filter - filters the dataset by 
--filtertheta  - threshold by which the dataframes must be filtered. 
--filterBy - filter by an attirbute (or column) in the dataframe

Filtering the dataset reduces the number of nodes both hatchet and callflow has to process, and thereby increasing the response times. We suggest filtering by 0.01 percent of the inclusive/exclusive time of a node. 

The filtered dataset can also be stored to avoid the filter step on each run. (TODO: Find an intermediate format for interfacing hatchet and callflow)

Client side of Callflow is written in semi ES5->ES6 fashion. Hence it requires a transpiler like browserify or webpack to work with. We currently use browserify to write into a bundle.js file found in /build. (TODO: Make it more automatic)

To run the client,

``` 
	forever build.js
```
### Reference

Any published work that utilizes this software should include the following
reference:

```
Huu Tan Nguyen, Abhinav Bhatele, Peer-Timo Bremer, Todd Gamblin, Martin Schulz,
Lai Wei, David Böhme, and Kwan-Liu Ma. VIPACT: A visualization interface for
analyzing calling context trees. In Proceedings of the 3rd Workshop on Visual
Performance Analysis, VPA '16, November 2016. LLNL-CONF-704659.
```

### Copyright

Copyright (c) 2018, Lawrence Livermore National Security, LLC.
Produced at the Lawrence Livermore National Laboratory.

Written by Huu Tan Nguyen <htpnguyen@ucdavis.edu>, Suraj Kesavan <spkesavan@ucdavis.edu>.



LLNL-CODE-740862. All rights reserved.

