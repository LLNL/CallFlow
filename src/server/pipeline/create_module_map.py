import json
import os
from os import listdir
from os.path import isfile, join


def dump_module_map(modmap, fname):
    f = open(fname,)
    data = json.load(f)
    # print(data)
    # -------------------------------------------------------
    # collect all functions
    functions = [n["label"] for n in data["nodes"]]
    # create the module map
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


def nodeMap(fname):
    f = open(fname,)
    data = json.load(f)
    functions = [n["label"] for n in data["nodes"]]
    return functions


def main():
    HOME = os.getcwd().split("CallFlow")[0] + "CallFlow/data"
    directory = HOME + "/amm-24/"
    files = [f for f in listdir(directory) if isfile(join(directory, f))]

    modmap = {}
    nodemap = {}
    for fileName in files:
        print(fileName)
        dump_module_map(modmap, directory + fileName)

        # nodemap[fileName] = nodeMap(directory + fileName)
    # ret = [dump_module_map(directory + fileName) for fileName in files]
    nodemap_file = directory + "/nodemap_amm.json"
    print(nodemap_file)
    with open(nodemap_file, "w") as f:
        json.dump(nodemap, f)


if __name__ == "__main__":
    main()
