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
 $ node main.js
```
Point browser to http://localhost:8500

### Data
Data is located under the data directory. Miranda data is included in the initial commit
The application requires three files:
	experiment.xml : This is the xml file for the call tree data

	nodeData.json : A json file contains the metrics for each call tree node
			Each line in the file contains the following information
			{
			    "id" : The call tree node id
			    "inc" : An array of inclusive runtimes
			    "exc" : An array of exclusive runtimes 
			 }

	config.json : A configuration file to tell the parser how to parse some problematic load modules
		      The format of the file is follow:
		     "load module name" : {
						"id" : The id of the load module, taken form the xml file
						"files" : An array of file prefixes
						"functions" : {
								"name of function" : An array of name prefixes to match under this function
							      }
					  }
