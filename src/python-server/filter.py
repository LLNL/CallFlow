# Get the inclusive runtime of the root
def getRunTime(gf):
    root_metrics = self.lookup(gf.dataframe, gf.graph.roots[0])
    return root_metrics[['CPUTIME (usec) (I)']].max()[0]

# TODO: Move to a new file if we need to filter by more attributes
def byIncTime(gfs, threshold=0.01):
    ret = []
    for idx, gf in gfs:
        if debug:
            print "Filtering by Inclusive time for the {0}th graphframe".format(idx)
            t = time.time()
        max_inclusive_time =  self.getRunTime(gf)
        filter_df = gf.dataframe[(gf.dataframe['CPUTIME (usec) (I)'] > threshold*max_inclusive_time)]
        if debug:
            print '[Filter] Removed {0} nodes by threshold {1}'.format(gf.dataframe.shape[0] - filter_df.shape[0], max_inclusive_time)
            print '[Filter] Nodes left: '.format(filter_df.shape[0])
            print "Time consumed", time.time() - t
        ret.append(filter_df)
    return ret



