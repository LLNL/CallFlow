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

Copyright (c) 2017, Lawrence Livermore National Security, LLC.
Produced at the Lawrence Livermore National Laboratory.

Written by Huu Tan Nguyen <htpnguyen@ucdavis.edu>.

LLNL-CODE-740862. All rights reserved.

