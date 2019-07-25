##############################################################################
# Copyright (c) 2018-2019, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
#
# This file is part of Callflow.
# Created by Suraj Kesavan <kesavan1@llnl.gov>.
# LLNL-CODE-741008. All rights reserved.
#
# For details, see: https://github.com/LLNL/Callflow
# Please also read the LICENSE file for the MIT License notice.
##############################################################################

#!/usr/bin/env python3

import pandas as pd
import time 
import utils
from logger import log
import os
from hatchet import *


class Create:
    '''
    Creates a graph frame.
    Input : config variable, and dataset name
    Output : State object containing components of graphframe as separate object variables. 
    '''
    def __init__(self, config, name):
        utils.debug("Creating graphframes: ", name)
        self.config = config
        self.name = name
        self.run()

    def run(self):
        callflow_path = os.path.abspath(os.path.join(__file__, '../../../..'))
        print("CallFlow path is", callflow_path)
        data_path = os.path.abspath(os.path.join(callflow_path, self.config.paths[self.name]))

        gf = GraphFrame()
        if self.config.format[self.name] == 'hpctoolkit':
            gf.from_hpctoolkit(data_path)
        elif self.config.format[self.name] == 'caliper':                
            gf.from_caliper(data_path)  

        self.gf = gf
        self.df = gf.dataframe
        self.node_hash_map = utils.node_hash_mapper(self.df)    
        self.graph = gf.graph