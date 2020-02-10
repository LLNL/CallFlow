CallFlow (Dev)
============

CallFlow is an interactive visual analysis tool that provides a high-level overview of CCTs together with semantic refinement operations to progressively explore the
CCTs.

# Installation.
```
	cd src
	npm install
    pip install -r requirements.txt
```

# Preparing Data.

Callflow currently, supports two formats, [hpctoolkit](http://hpctoolkit.org/) and [caliper](www.github.com/LLNL/caliper).

```
	{$CALLFLOW_PATH}/data/{hpctoolkit_dataset}
		  .../experiment.xml
	      .../experiment-001.metric-db
		  .../experiment-002.metric-db
		  .../experiment-003.metric-db
		  ...

	{$CALLFLOW_PATH}/data/{caliper_dataset}
		  .../data/experiment.json

```

# Configuration file.
CallFlow requires the user to specify how various data preprocessing operations are performed (i.e., filtering, grouping operations).


To run the server,

```
    cd src/server
	python3 app.py --config {config_file}
```


To run the app,

```
	cd src/public
	npm run dev
```
# Reference

Any published work that utilizes this software should include the following references:

* Huu Tan Nguyen, Abhinav Bhatele, Nikhil Jain, Suraj P. Kesavan, Harsh Bhatia, Todd Gamblin, Kwan-Liu Ma, Peer-Timo Bremer. In Proceedings of the IEEE Transactions on Visualization and Computer Graphics, 2019. LLNL-JRNL-797378. DOI:10.1109/TVCG.2019.2953746

* Huu Tan Nguyen, Abhinav Bhatele, Peer-Timo Bremer, Todd Gamblin, Martin Schulz,
Lai Wei, David Böhme, and Kwan-Liu Ma. VIPACT: A visualization interface for
analyzing calling context trees. In Proceedings of the 3rd Workshop on Visual
Performance Analysis, VPA '16, November 2016. LLNL-CONF-704659.

# Copyright

Copyright (c) 2019, Lawrence Livermore National Security, LLC.
Produced at the Lawrence Livermore National Laboratory.

Written by Huu Tan Nguyen (<htpnguyen@ucdavis.edu>), Suraj Kesavan (<spkesavan@ucdavis.edu>).

LLNL-CODE-740862. All rights reserved.