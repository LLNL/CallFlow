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

## App server
  For the web app, install the required packages.
```
cd app
npm install
```

# Preparing Data

See [instructions](https://github.com/jarusified/CallFlow/tree/v2/data/README.md).

See [data examples](https://github.com/jarusified/CallFlow/tree/v2/data)

# Running the web app

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