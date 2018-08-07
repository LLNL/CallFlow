# HPCTOOLKIT to CALLFLOW converter

This script converts hpctoolkit databases to the Callflow format.

It requires the experiment.xml and the experiment-1.mdb files generated with hpcrun and
hpcviewer respectively.

To generate the mdb file, open the profile with hpcviewer and create a histogram,
the tool with automatically merge all the partial files and create the experiment-1.mdb file.

Usage:

```
./hpct2cf <hpctoolkit-database-path> <experiment-name> <number-nodes>
```

The script takes the name for the data folder and json file where callflow data will be generated as the second argument
and the  number of nodes where the experiment was run (srun -N nodes) as the third one.

