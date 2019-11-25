##############################################################################
# Copyright (c) 2018-2019, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
#
# This file is part of Callflowt.
# Created by Suraj Kesavan <kesavan1@llnl.gov>.
# LLNL-CODE-741008. All rights reserved.
#
# For details, see: https://github.com/LLNL/Callflow
# Please also read the LICENSE file for the MIT License notice.
##############################################################################
import json
from logger import log
import os

class configFileReader():
    def __init__(self, filepath):
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, filepath)
        f = open(filename, 'r').read()
        self.json = self.json_data(f)
        self.datasets = self.json['datasets']  
        self.runName = self.json['runName']
        self.filter_perc = self.json['filter_perc']
        self.callflow_path = self.json['callflow_path']
        self.processed_path = os.path.join(self.callflow_path, self.json['save_path'])
        self.paths = {}
        self.props = {}
        self.nop  = {}
        self.format = {}
        self.fnMap = {}
        self.fileMap = {} 
        self.names = []
        self.dataset_names = []
        self.run()

    def run(self):
        for idx, data in enumerate(self.datasets):
            name = data['name']
            self.names.append(name)
            self.dataset_names.append(name)
            # log.info('Config file: {0}'.format(json.dumps(data, indent=4, sort_keys=True)))
            self.paths[name] = data['path']
            self.format[name] = data['format'] 
            self.fnMap[name] = self.getFuncMap(data['props'])
            self.fileMap[name] = self.getFileMap(data['props'])
            self.nop[name] = data['nop']

    # File map from the config file
    def getFileMap(self, props):
        fileMap = {}
        for obj in props:
            name = props[obj]['name']
            fileMap[name] = props[obj]['files']
        return fileMap

    # Function map from the config file
    def getFuncMap(self, props):
        funcMap = {}
        for obj in props: 
            name = props[obj]['name']
            funcMap[name] = props[obj]['functions']
        return funcMap

    def json_data(self, json_text):
        return self._byteify(json.loads(json_text, object_hook=self._byteify), ignore_dicts=True)
    
    def _byteify(self, data, ignore_dicts = False):
        # if this is a unicode string, return its string representation
        if isinstance(data, bytes):
            return data.encode('utf-8')
        # if this is a list of values, return list of byteified values
        if isinstance(data, list):
            return [ self._byteify(item, ignore_dicts=True) for item in data ]
        # if this is a dictionary, return dictionary of byteified keys and values
        # but only if we haven't already byteified it
        if isinstance(data, dict) and not ignore_dicts:
            return {
                self._byteify(key, ignore_dicts=True): self._byteify(value, ignore_dicts=True) for key, value in data.items()
            }
        # if it's anything else, return it in its original form
        return data

    def __repr__(self):
        items = ("%s = %r" % (k, v) for k, v in self.__dict__.items())
        return "<%s: {%s}> \n" % (self.__class__.__name__, ', '.join(items))
