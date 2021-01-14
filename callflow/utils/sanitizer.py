import hatchet as ht
from callflow import get_logger
LOGGER = get_logger(__name__)


# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
class Sanitizer:

    _KNOWN_TYPES = ["function", "statement", "loop", "region"]

    def __init__(self, profile_format=''):
        self.profile_format = profile_format

    def __str__(self):
        return f"Sanitizer<{self.profile_format}>"

    def __repr__(self):
        return self.__str__()

    '''
    def __call__(self, _):
        r = Sanitizer.utils_sanitize_name(_)
        return r
    '''

    # collect all such functions before cleaning them up
    @staticmethod
    def utils_sanitize_name(name):
        ret_name = ""
        if name is None:
            ret_name = "Unknown"
            return ret_name
        if "/" in name:
            name_split = name.split("/")
            ret_name = name_split[len(name_split) - 1]
        else:
            ret_name = name
        return ret_name

    @staticmethod
    def utils_node_dict_from_frame(frame: ht.frame.Frame):
        """
        Constructs callsite's name from Hatchet's frame.
        """
        assert frame.get("type") in ["function", "statement", "loop", "region"]

        if frame["type"] == "function":
            return {"name": frame.get("name"), "line": "NA", "type": "function"}
        elif frame["type"] == "statement":
            return {
                "name": frame.get("file"),
                "line": frame.get("line"),
                "type": "statement",
            }
        elif frame["type"] == "loop":
            return {"name": frame.get("file"), "line": frame.get("line"), "type": "loop"}
        elif frame["type"] == "region":
            return {"name": frame.get("name"), "line": "NA", "type": "region"}

    # --------------------------------------------------------------------------
    def from_htframe(self, frame: ht.frame.Frame):

        assert isinstance(frame, ht.frame.Frame)
        assert frame.get("type") in Sanitizer._KNOWN_TYPES

        # ----------------------------------------------------------------------
        node_dict = Sanitizer.utils_node_dict_from_frame(frame)
        node_name = Sanitizer.utils_sanitize_name(node_dict["name"])

        # ----------------------------------------------------------------------
        # supergraph.hatchet_graph_to_nxg._get_node_name
        if node_dict.get("line") != "NA" and node_dict.get("line") is not None:
            node_name += ":" + str(node_dict.get("line"))
        # ----------------------------------------------------------------------

        #LOGGER.warning(f'{frame} --> {node_name}')
        return node_name

    # --------------------------------------------------------------------------
    def in_graphMapper(self, frame: ht.frame.Frame):

        assert isinstance(frame, ht.frame.Frame)
        assert frame.get("type") in Sanitizer._KNOWN_TYPES

        # ----------------------------------------------------------------------
        # utils.node_dict_from_frame
        node_dict = Sanitizer.utils_node_dict_from_frame(frame)

        if node_dict["type"] == "loop":
            node_name = "Loop@" + Sanitizer.utils_sanitize_name(
                node_dict["name"] + ":" + str(node_dict["line"])
            )
        elif node_dict["type"] == "statement":
            node_name = (
                    Sanitizer.utils_sanitize_name(node_dict["name"])
                    + ":"
                    + str(node_dict["line"])
            )
        else:
            node_name = node_dict["name"]
        # ----------------------------------------------------------------------

        #LOGGER.warning(f'{frame} --> {node_name}')
        return node_name
# ------------------------------------------------------------------------------
