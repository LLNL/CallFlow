### Requirements
You will need the latest version of Node.js install (v. 7.7.2 as of writing)

### Installation
To install, change directory to the src/ folder
Run:
```
 $ npm install
```

### To Run
In the src/ directory
Run: 
```
 $ node main.js -d /path/to/datasetinfo.json
```
Point browser to http://localhost:8500

### Data
Data is located under the data directory. Miranda data is included in the initial commit
The application requires 3 files with 1 optional file:

	Dataset information file : This is a json file that specify where to look for the data. It requires 3 fields with 1 optional field. The format is as follow
			{
				"path" : /path/to/directory/contains/dataset/ (Note the '/' at the end of the path)
				"experiment" : Name of the xml file
				"nodeMetric" : Name of the json file that contains the metrics for each call tree node. Detail of the format for this file is bellow.
				"config" : Name of the config file. This is optional. Detail of the format for this file is bellow.
			}
	
	XML file : This is the xml file for the call tree data

	Node metric file : A json file contains the metrics for each call tree node
			Each line in the file contains the following information
			{
			    "id" : The call tree node id
			    "inc" : An array of inclusive runtimes
			    "exc" : An array of exclusive runtimes 
			 }

	Configureation file : A configuration file to tell the parser how to parse some problematic load modules (This is optional)
		      The format of the file is follow:
		     "load module name" : {
						"id" : The id of the load module, taken form the xml file
						"files" : An array of file prefixes
						"functions" : {
								"name of function" : An array of name prefixes to match under this function
							      }
					  }
