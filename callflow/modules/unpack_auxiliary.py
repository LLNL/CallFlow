import os 
import numpy as np
import callflow

from callflow import get_logger
LOGGER = get_logger(__name__)

class UnpackAuxiliary:

    _FILENAMES = {
        "ht": "hatchet_tree.txt",
        "df": "df.pkl",
        "nxg": "nxg.json",
        "env_params": "env_params.txt",
        "aux": "aux-{}.npz",
    }

    def __init__(self, path, name):
        self.name = name
        if name != "ensemble":
            npz = UnpackAuxiliary.read_aux(path, name)
            self.result = UnpackAuxiliary.unpack_single(npz, name)
        else:
            npz = UnpackAuxiliary.read_aux(path, 'ensemble')
            self.result = UnpackAuxiliary.unpack_single(npz, name)
            
    @staticmethod
    def read_aux(path, name):
        """

        :param path:
        :return:
        """
        fname = os.path.join(path, UnpackAuxiliary._FILENAMES["aux"].format(name))
        LOGGER.debug(f"Reading ({fname})")

        data = {}
        ext = os.path.splitext(UnpackAuxiliary._FILENAMES["aux"])[-1]
        try:
            if '.json' == ext:
                with open(fname, "r") as fptr:
                    data = json.load(fptr)
            elif '.npz' == ext:
                data = np.load(fname, allow_pickle=True)

        except Exception as e:
            LOGGER.critical(f"Failed to read aux file: {e}")
        return data

    def unpack_single(npz, name):
        c2m_dict = npz["c2m"].item()
        m2c_dict = npz["m2c"].item()
        modules = npz["modules"]
        summary = npz["summary"]

        unpack_ensemble = False if name != "ensemble" else True

        return {
            "summary": summary,
            "modules": modules,
            "data_cs": UnpackAuxiliary.unpack_data(npz["data_cs"], unpack_ensemble),
            "data_mod": UnpackAuxiliary.unpack_data(npz["data_mod"], unpack_ensemble),
            "c2m": { c: modules[c2m_dict[c]]  for c in c2m_dict },
            "m2c": { modules[m]: m2c_dict[m].tolist() for m in m2c_dict}
        }

    def unpack_ensemble():
        pass

    @staticmethod
    def unpack_data(data, unpack_ensemble):
        _d = data.item()
        
        ret = {}
        for cs in _d.keys():
            ret[cs] = {
                "name": _d[cs]['name'],
                "id": str(_d[cs]["id"]),
                "component_path": _d[cs]["component_path"].tolist(),
                "time (inc)": UnpackAuxiliary.unpack_metric(_d[cs], "time (inc)", unpack_ensemble),
                "time": UnpackAuxiliary.unpack_metric(_d[cs], "time", unpack_ensemble),
            }
        return ret

    @staticmethod
    def unpack_metric(d, metric, unpack_ensemble):
        ret = {
            "d": d[metric]['d'].tolist(),
            "min": float(d[metric]["rng"][0]),
            "max": float(d[metric]["rng"][1]),
            "mean": float(d[metric]["uv"][0]),
            "var": float(d[metric]["uv"][1]),
            "imb": float(d[metric]["imb"]),
            "kurt": float(d[metric]["ks"][0]),
            "skew": float(d[metric]["ks"][1]),
        }

        if not unpack_ensemble:
            ret["hists"] = {
                "rank": UnpackAuxiliary.unpack_hists(d[metric]["hst"], "rank"),
            }
        else:
            ret["hists"] = {
                # "name": UnpackAuxiliary.unpack_hists(d[metric]["hst"], "name"),
                "dataset": UnpackAuxiliary.unpack_hists(d[metric]["hst"], "dataset"),
            }
        ret["boxplots"] = UnpackAuxiliary.unpack_box(d[metric]["box"])

        if unpack_ensemble:
            ret["gradients"] = d[metric]["grd"]

        return ret
    
    @staticmethod
    def unpack_hists(hists, prop):
        return {
            "x": hists[prop][0].tolist(),
            "y": hists[prop][1].tolist(),
            "x_min": float(hists[prop][0][0]),
            "x_max": float(hists[prop][0][-1]),
            "y_min": float(hists[prop][1].min()),
            "y_max": float(hists[prop][1].max()),
        }

    @staticmethod
    def unpack_box(box):
        return {
            "q": box["q"].tolist(),
            "outliers": {
                "values": box["oval"].tolist(),
                "ranks": box["orank"].tolist()
            }
        }
