# Datasets for testing CallFlow.

All the listed datasets are provided by [Hatchet](https://github.com/LLNL/hatchet/tree/develop/hatchet/tests/data).


## Directory Structure
Callflow currently, supports two formats, [hpctoolkit](http://hpctoolkit.org/) and [caliper](www.github.com/LLNL/caliper). 

Make sure the directory structure for each format is as shown below.

### HPCToolkit
For HPCToolkit data, make sure there is an experiment.xml file and all the [metric-db](http://hpctoolkit.org/man/hpcprof.html) files are individual files. 

```
{$CALLFLOW_PATH}/data/{hpctoolkit_dataset}
	.../experiment.xml
	.../thread-001.metric-db
	.../thread-002.metric-db
	.../thread-003.metric-db
	...
```

### Caliper	
For caliper data, make sure you generate using `caliper-json` format.

```
{$CALLFLOW_PATH}/data/{caliper_dataset}
	.../data.json
    .../

```

# Configuration file.
- Once the data is in place, create a `config.callflow.json` file inside the data directory. 

- `config.callflow.json` uses JSON formatting to help pre-process the datasets. 


- The "scheme" key determines how the preprocessing operations are performed (i.e., filtering, grouping operations) using a scheme.


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
