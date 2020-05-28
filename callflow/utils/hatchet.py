def getPathListFromFrames(frames):
    paths = []
    for frame in frames:
        path = []
        for f in frame:
            if f["type"] == "function":
                path.append(f["name"])
            elif f["type"] == "statement":
                path.append(f["file"] + ":" + str(f["line"]))
            elif f["type"] == "loop":
                path.append(f["file"] + ":" + str(f["line"]))
        paths.append(path)
    return path


def framesToPathLists(paths):
    all_paths = []
    for path in paths:
        curr_path = []
        for frame in path:
            curr_path.append(frame["name"])
        all_paths.append(curr_path)
    return all_paths


def bfs_hatchet(graph):
    ret = {}
    node_count = 0
    roots = graph.roots
    for root in roots:
        node_gen = graph.roots[0].traverse()

        callpaths = root.paths()
        try:
            while callpaths != None:
                node_count += 1
                ret[root.callpath[-1]] = root.df_index
                root = next(node_gen)
        except StopIteration:
            pass
        finally:
            print("Total nodes in the graph", node_count)
            del root
            return ret


def getNodeCallpath(node):
    ret = []
    list_of_frames = list(node.path())
    for frame in list_of_frames:
        name = frame.get("name")
        if name != None:
            ret.append(frame.get("name"))
        else:
            ret.append(frame.get("file"))
    return ret


def getNodeParents(node):
    return node.parents


def getNodeName(node):
    name = node.frame.get("name")
    if name != None:
        return node.frame.get("name")
    else:
        return node.frame.get("file")


def sanitizeName(name):
    if name is None:
        return "Unknown"
    if "/" in name:
        name_split = name.split("/")
        return name_split[len(name_split) - 1]
    else:
        return name


# Return the Callsite name from frame.
def getNodeDictFromFrame(frame):
    if frame["type"] == "function":
        return {"name": frame["name"], "line": "NA", "type": "function"}
    elif frame["type"] == "statement":
        return {"name": frame["file"], "line": frame["line"], "type": "statement"}
    elif frame["type"] == "loop":
        return {"name": frame["file"], "line": frame["line"], "type": "loop"}
    else:
        return {}
