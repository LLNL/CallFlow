# ------------------------------------------------------------------------------
# some global enumerations
# ------------------------------------------------------------------------------

# file formats that can be read
FILE_FORMATS = ["hpctoolkit", "caliper", "caliper_json", "gprof", "literal", "lists"]

# ------------------------------------------------------------------------------
TIME_COLUMNS = ["time (inc)", "time"]

METRIC_PROXIES = {
    "time (inc)": [
        "inclusive#time.duration",
        "REALTIME (sec) (I)",
        "1.CPUTIME (sec) (I)",
    ],
    "time": [
        "sum#time.duration",
        "sum#sum#time.duration",
        "REALTIME (sec) (E)",
        "1.CPUTIME (sec) (E)",
    ],
}

# ------------------------------------------------------------------------------
