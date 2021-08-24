import os
import re
import math
import hatchet as ht 

import callflow
LOGGER = callflow.get_logger(__name__)


FRAME_KEYS = ["file", "name"]

class RegexModuleMatcher:
    def __init__(self, m2c, m2m: dict = {}):
        self.re_map = {}

        for m, regex in m2c.items():
            for match_key, patterns in regex.items():
                for pattern in patterns:
                    re_pattern = re.compile(pattern)
                    self.re_map[re_pattern] = m
                
        self.m2c = {m: [] for m in m2c.keys()}
        self.m2m = m2m
        self.m2c["Unknown"] = []
        
        self.assign_unknown = False
                
    def match_frame(self, ht_frame, ht_key):
        return [m for reg, m in self.re_map.items() if re.search(reg, ht_frame.get(ht_key)) is not None]
    
    def _get_percentage(self):
        return math.floor((self.counter/len(self.nodes)*100))
    
    @staticmethod
    def sanitize(_: str):
        return os.path.basename(_) if _ is not None else "Unknown"
    
    @staticmethod
    def from_htframe(_:  ht.frame.Frame):
        assert isinstance(_, ht.frame.Frame)

        _type = _["type"]
        assert _type in ["function", "statement", "loop", "region"]


        if _type in ["function", "region"]:
            return RegexModuleMatcher.sanitize(_.get("name", "Unknown"))

        elif _type == "statement":
            _file, _line = _["file"], str(_["line"])
            return RegexModuleMatcher.sanitize(_file) + ":" + _line

        elif _type == "loop":
            _file, _line = _["file"], str(_["line"])
            return "Loop@" + RegexModuleMatcher.sanitize(_file) + ":" + _line

    @staticmethod
    def module_in_dataframe(df, m2m, node):
        if "module" not in df.columns:
            return None

        node_df = df.loc[df['node'] == node]

        if node_df.empty:
            return None

        module = node_df['module'].unique().tolist()

        if module[0] is None:
            return None

        if (module[0] not in m2m.keys()):
            raise Exception(f"{module[0]} not found in m2m mapping.")

        if module[0] in m2m.keys():
            return m2m[module[0]]

    def match(self, gf, nodes=None):
        assert isinstance(gf, ht.GraphFrame)
       
        self.gf = gf
            
        if nodes is None:
            self.nodes = list(self.gf.graph.traverse())
        else:
            self.nodes = nodes
                        
        self.counter = 0
        notfound = 0
        for node in self.nodes:
            node_name = RegexModuleMatcher.from_htframe(node.frame)

            module_in_df = RegexModuleMatcher.module_in_dataframe(gf.dataframe.reset_index(), self.m2m, node)
            if module_in_df is not None:
                if module_in_df not in self.m2c.keys():
                    self.m2c[module_in_df] = []
                self.m2c[module_in_df].append(node_name) 
                continue

            for fk in FRAME_KEYS:
                if node.frame.get(fk) is not None:
                    matches = self.match_frame(node.frame, fk)
                    
                    if len(list(set(matches))) > 1:
                        print(f"Multiple matches found for {node}: {matches}")
                        self._get_input(node_name)
                        continue

                    if len(matches) == 0:
                        if node_name == "<unknown file>:0":
                            self.m2c["libmonitor.so.0.0.0"].append(node_name)
                            continue

                        print(f"No matches found: {node}")
                        self.print_m2c()
                        self._get_input(node_name)
                        continue

                    if node_name not in self.m2c[matches[0]]:
                        self.m2c[matches[0]].append(node_name)
                        
            self.counter += 1
            
        LOGGER.info(f"Successfully assigned a module for {self.counter} nodes.")
        LOGGER.debug(f"Failed to assign a module for {notfound} nodes.")

        
        return self.m2c

    def print_m2c(self):
        print("====================================")
        print("Current module-callsite map keys: \n")
        print("====================================")
        for k in self.m2c.keys():
            print(k)
            
    def _get_input(self, node_name):
        if self.assign_unknown:
            self.m2c["Unknown"].append(node_name)
            return
            
        print(f"====== {self._get_percentage()}% =======")
        module = input("Enter the module name (0 for Unknown): ")
        if module == "0":
            self.m2c["Unknown"].append(node_name)
            return 
        
        if module == "-1":
            self.assign_unknown = True
            self.m2c["Unknown"].append(node_name)
            return
        
        if module not in self.m2c:
            self.m2c[module] = []
            
        self.m2c[module].append(node_name)
        return

    def print_summary(self):
        print("======= Regex Matcher Summary =========")
        for k, v in self.m2c.items():
            print(f"Module: {k}, callsites: {len(v)}")
        print("=======================================")
    
    # TODO: Remove this and use the supergraph.df_add_column.
    @staticmethod
    def df_add_column(
        df,
        column_name,
        apply_value=None,
        apply_func=None,
        apply_dict=None,
        dict_default=None,
        apply_on="name",
        update=False,
    ):
        """
        Wrapper to add a column to a dataframe in place.

        :param column_name: (str) Name of the column to add in the dataframe
        :param apply_value: (*) Value to apply on the column
        :param apply_func: (func) Function to apply on the column
        :param apply_dict: (dict) Dict to apply on the column
        :param apply_on: (str) Column to apply the func, value or dict on
        :param dict_default: (dict) default dictionary to apply on
        :param update: (bool) in place update or not
        """
        has_value = apply_value is not None
        has_func = apply_func is not None
        has_dict = apply_dict is not None
        assert 1 == int(has_value) + int(has_func) + int(has_dict)

        already_has_column = column_name in df.columns
        if already_has_column and not update:
            return

        action = "updating" if already_has_column and update else "appending"

        if has_value:
            assert isinstance(apply_value, (int, float, str))
            LOGGER.debug(f'{action} column "{column_name}" = "{apply_value}"')
            df[column_name] = apply_value

        if has_func:
            assert callable(apply_func) and isinstance(apply_on, str)
            LOGGER.debug(f'{action} column "{column_name}" = {apply_func}')
            df[column_name] = df[apply_on].apply(apply_func)

        if has_dict:
            assert isinstance(apply_dict, dict) and isinstance(apply_on, str)
            LOGGER.debug(f'{action} column "{column_name}" = (dict); default=({dict_default})')
            df[column_name] = df[apply_on].apply(
                lambda _: apply_dict.get(_, dict_default)
            )
            
    @staticmethod
    def update_df(df, m2c={}, column_name="module"):
        import pandas as pd
        assert isinstance(df, pd.DataFrame)

        c2m = {}
        for k, v in m2c.items():
            for cs in v:
                c2m[cs] = k
                
        # Update the "module" column with the provided callsite_module_map.
        RegexModuleMatcher.df_add_column(df, column_name, apply_dict=c2m, apply_on="name", update=True)
    
    def dump_mapping(self, fname):
        import json
                
        with open(fname, "w") as fptr:
            json.dump(self.m2c, fptr, indent=2)
        
            print(f"Dumped the m2c map to {fname}.")