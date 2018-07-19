import os
import fnmatch
from logger import log


# Input : ./xxx/xxx/yyy
# Output: yyy
def sanitizeName(self, name):
    if name == None:
        return None
    name_split = name.split('/')
    return name_split[len(name_split) - 1]  
    
# Automatic look up for the format
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
            
