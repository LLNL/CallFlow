import os
import fnmatch
from logger import log


# Input : ./xxx/xxx/yyy
# Output: yyy
def sanitizeName(name):
    if name == None:
        return None
    name_split = name.split('/')
    return name_split[len(name_split) - 1]  

# Lookup by the node hash
def lookup(df, node_hash):
    return df.loc[df['node'] == node_hash] 

# Get the max Inclusive time from the root of the CCT.
def getMaxIncTime(gf):
    ret = 0.0
    for root in gf.graph.roots:        
        ret = max(ret, lookup(gf.dataframe, root)['CPUTIME (usec) (I)'].max())
    return ret

# TODO: Get the maximum exclusive time from the graphframe. 
def getMaxExcTime(gf):
    ret  = gf.dataframe['CPUTIME (usec) (E)'].max()
    print ret
    return ret

# Find the file format automatically.  Automatic look up for the format
# args: paths (from config file)
# return : Array(gf_format)
# Todo: Write better regex to eliminate looping through mdb files
def automatic_gfs_format_lookup(paths):
    ret = []
    pattern = 'experiment*'
    for path in paths:
        filtered_path =  fnmatch.filter(os.listdir(path), pattern)
        for file in filtered_path:
            if file.endswith('.xml'):
                ret.append('hpctoolkit')
            elif file.endswith('.json'):
                ret.append('caliper')
    log.info("Found formats = {0}".format(ret))
    return ret
            
