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

class filterGraphFrame:
    def __init__(self, state):
        log.info("[Filter]")
        self.graph = state.graph
        self.df = state.df
        self.run()

    def run(self):
        if self.args.filterBy == "IncTime":
            max_inclusive_time = utils.getMaxIncTime(gf)
            filter_gf = gf.filter(lambda x: True if(x['CPUTIME (usec) (I)'] > 0.01*max_inclusive_time) else False)
        elif self.args.filterBy == "ExcTime":
            max_exclusive_time = utils.getMaxExcTime(gf)
            log.info('[Filter] By Exclusive time = {0})'.format(max_exclusive_time))
            filter_gf = gf.filter(lambda x: True if (x['CPUTIME (usec) (E)'] > 0.01*max_exclusive_time) else False)
        else:
            log.warn("Not filtering.... Can take forever. Thou were warned")
            filter_gf = gf
        log.info('[Filter] Removed {0} rows. (time={1})'.format(gf.dataframe.shape[0] - filter_gf.dataframe.shape[0], time.time() - t))
        log.info("Grafting the graph!")
        filter_gf = filter_gf.graft()
        log.info("[Graft] {1} rows left (time={0})".format(time.time() - t, filter_gf.dataframe.shape[0]))
        fgfs.append(filter_gf)
    return fgfs