import json
import os
from os import listdir
from os.path import isfile, join


fname = "counter_summary_1000.json"


def dump_module_map(fname):
    f = open(fname,)
    data = json.load(f)
    # -------------------------------------------------------
    # collect all functions
    functions = [n["label"] for n in data["nodes"]]
    print(len(functions))
    # create the module map
    modmap = {}
    for f in functions:
        toks = f.split("::")
        modname = "main" if len(toks) == 1 else toks[-2]

        if modname not in modmap.keys():
            modmap[modname] = []

        modmap[modname].append(f)

    # remove duplicate entries
    for k in modmap.keys():
        modmap[k] = list(set(modmap[k]))
    # -------------------------------------------------------
    # print the module map
    for k in modmap.keys():
        print("-->", k, " -->", modmap[k])
        return modmap


def main():
    HOME = os.getcwd().split("CallFlow")[0] + "CallFlow/data"
    directory = HOME + "/amm/"
    files = [f for f in listdir(directory) if isfile(join(directory, f))]
    ret = [dump_module_map(directory + fileName) for fileName in files]

    print(json.dumps(ret[0]))


if __name__ == "__main__":
    main()
