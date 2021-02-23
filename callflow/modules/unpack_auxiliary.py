import os 
import numpy as np
import callflow

from callflow import get_logger
LOGGER = get_logger(__name__)

class UnpackAuxiliary:

    # TODO: Remove this.
    _FILENAMES = {
        "ht": "hatchet_tree.txt",
        "df": "df.pkl",
        "nxg": "nxg.json",
        "env_params": "env_params.txt",
        "aux": "aux-{}.npz",
    }

    def __init__(self, path, name):
        save_path = "/Users/jarus/Work/llnl/callflow_data/lulesh-8-runs/.callflow"
        self.name = name
        if name != "ensemble":
            path = os.path.join(save_path, name)
            npz = UnpackAuxiliary.read_aux(path, name)
            self.result = UnpackAuxiliary.unpack_single(npz)
        else:
            e_path = os.path.join(save_path, "ensemble")
            e_npz = UnpackAuxiliary.read_aux(e_path, "ensemble")
            npz = UnpackAuxiliary.read_aux(e_path, name)
            self.result = UnpackAuxiliary.unpack_ensemble(npz, e_npz)
            
    # TODO: Remove this later.
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

    def unpack_single(npz):
        c2m_dict = npz["c2m"].item()
        m2c_dict = npz["m2c"].item()
        modules = npz["modules"]
        summary = npz["summary"]

        return {
            "summary": summary,
            "modules": modules,
            "data_cs": UnpackAuxiliary.unpack_data(npz["data_cs"]),
            "data_mod": UnpackAuxiliary.unpack_data(npz["data_mod"]),
            "c2m": { c: modules[c2m_dict[c]]  for c in c2m_dict },
            "m2c": { modules[m]: m2c_dict[m].tolist() for m in m2c_dict}
        }

    @staticmethod
    def unpack_ensemble(npz, e_npz):
        c2m_dict = npz["c2m"].item()
        m2c_dict = npz["m2c"].item()
        if e_npz is None:
            modules = npz["modules"]
        else:
            modules = e_npz["modules"]
        summary = npz["summary"]

        return {
            "summary": summary,
            "modules": modules,
            "data_cs": UnpackAuxiliary.unpack_data(npz["data_cs"], e_npz["data_cs"]),
            "data_mod": UnpackAuxiliary.unpack_data(npz["data_mod"], e_npz["data_mod"]),
            "c2m": { c: modules[c2m_dict[c]]  for c in c2m_dict },
            "m2c": { modules[m]: m2c_dict[m].tolist() for m in m2c_dict}
        }

    def unpack_data(data, e_data=None):
        _d = data.item()
        
        if e_data is not None:
            _e_d = e_data.item()

        ret = {}
        for cs in _d.keys():
            if e_data is None:
                _e_d_cs = None
            else:
                _e_d_cs = _e_d[cs]
            ret[cs] = {
                "name": _d[cs]['name'],
                "id": str(_d[cs]["id"]),
                "component_path": _d[cs]["component_path"].tolist(),
                "time (inc)": UnpackAuxiliary.unpack_metric("time (inc)",_d[cs], _e_d_cs),
                "time": UnpackAuxiliary.unpack_metric( "time", _d[cs], _e_d_cs),
            }
        return ret

    @staticmethod
    def unpack_metric(metric, d, e_d=None):
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

        if e_d is None:
            ret["hists"] = {
                "rank": UnpackAuxiliary.unpack_hists("rank", d[metric]["hst"]),
            }
        else:
            ret["hists"] = {
                "rank": UnpackAuxiliary.unpack_hists("rank", d[metric]["hst"], e_d[metric]["hst"], False),
                "name": UnpackAuxiliary.unpack_hists("name", d[metric]["hst"], e_d[metric]["hst"], False),
                "dataset": UnpackAuxiliary.unpack_hists("dataset", d[metric]["hst"], e_d[metric]["hst"], False),
            }
            # ret["e_hists"] = {
            #     "rank": UnpackAuxiliary.unpack_hists("rank", d[metric]["hst"], e_d[metric]["hst"], True),
            #     "name": UnpackAuxiliary.unpack_hists("name", d[metric]["hst"], e_d[metric]["hst"], True),
            #     "dataset": UnpackAuxiliary.unpack_hists("dataset", d[metric]["hst"], e_d[metric]["hst"], True),
            # }
        ret["boxplots"] = UnpackAuxiliary.unpack_box(d[metric]["box"])

        if e_d is not None:
            ret["gradients"] = e_d[metric]["grd"]

        return ret
    
    @staticmethod
    def unpack_hists(prop, hists, e_hists=None, ensemble=False):
        if e_hists is None:
            e_hists = hists

        if ensemble:
            result = {
                "x": e_hists[prop][0].tolist(),
                "y": e_hists[prop][1].tolist(),
                "x_min": float(e_hists[prop][0][0]),
                "x_max": float(e_hists[prop][0][-1]),
                "y_min": float(e_hists[prop][1].min()),
                "y_max": float(e_hists[prop][1].max()),
            }

        else:
            result = {
                "x": e_hists[prop][0].tolist(),
                "y": hists[prop][1].tolist(),
                "x_min": float(e_hists[prop][0][0]),
                "x_max": float(e_hists[prop][0][-1]),
                "y_min": float(hists[prop][1].min()),
                "y_max": float(hists[prop][1].max()),
            }
        
        return result


    @staticmethod
    def unpack_box(box):
        return {
            "q": box["q"].tolist(),
            "outliers": {
                "values": box["oval"].tolist(),
                "ranks": box["orank"].tolist()
            }
        }
