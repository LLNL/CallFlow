CallFlow 1.0
============

CallFlow is a visualization tool to view and analyze Calling Context Tree (CCT)
data provided by HPCToolkit. CallFlow uses Sankey diagrams to display the CCT
hierarchy.

### Requirements

You will need to install the latest version of Node.js (v7.7.2 or higher).

### Installation

To install, change directory to the src/ folder and run:
```
 $ npm install
 $ bower install
```
If you get a libtool related error during libxlmjs build in the first step on
Mac OSX, you should try again after removing the macports version of libtool
from your path.

### To Run

In the src/ directory, run:
```
 $ node index.js -d /path/to/datasetinfo.json
```
Point browser to http://localhost:8500

### Inputs

The application requires 3 files with 1 optional file:

1. Dataset information file: This is a json file that specifies where to look
for the data. It requires 3 fields with 1 optional field. The format is as
follows:
```
{
    "path" : /path/to/directory/contains/dataset/ (Note the '/' at the end of the path)
    "experiment" : Name of the xml file
    "nodeMetric" : Name of the json file that contains the metrics for each call tree node. Detail of the format for this file is bellow.
    "config" : Name of the config file. This is optional. Detail of the format for this file is bellow.
}
```

2. XML file : This is the xml file for the call tree data.

3. Node metric file: A json file that contains the metrics for each call tree
node Each line in the file contains the following information:
```
{
    "id" : The call tree node id
    "inc" : An array of inclusive runtimes
    "exc" : An array of exclusive runtimes
}
```

4. Configuration file: A configuration file to tell the parser how to parse
some problematic load modules (this is optional). The format of the file is
follows:
```
"load module name" : {
    "id" : The id of the load module, taken form the xml file
    "files" : An array of file prefixes
    "functions" : {
        "name of function" : An array of name prefixes to match under this function
	}
}
```

CallFlow v2.0 (Dev)
============

In an attempt to support a standard API and work with many formats (like hpctoolkit, caliper, etc. ), we have created a library, [hatchet](www.github.com/LLNL/hatchet). Hatchet analyzes performance data that is organized in a tree hierarchy (such as calling context trees, call graphs, nested regions' timers etc.).

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

