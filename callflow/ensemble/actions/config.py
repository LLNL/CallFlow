from utils.df import getMaxExcTime, getMinExcTime, getMaxIncTime, getMinIncTime


class Config:
    def __init__(self, config, states):
        self.states = states
        self.config = config

        self.addIncExcTime()

    def addIncExcTime(self):
        self.config.max_incTime = {}
        self.config.max_excTime = {}
        self.config.min_incTime = {}
        self.config.min_excTime = {}
        self.config.numbOfRanks = {}
        max_inclusvie_time = 0
        max_exclusive_time = 0
        min_inclusive_time = 0
        min_exclusive_time = 0
        for idx, state in enumerate(self.states):
            if state != "ensemble":
                self.config.max_incTime[state] = getMaxIncTime(self.states[state])
                self.config.max_excTime[state] = getMaxExcTime(self.states[state])
                self.config.min_incTime[state] = getMinIncTime(self.states[state])
                self.config.min_excTime[state] = getMinExcTime(self.states[state])
                # self.config.numbOfRanks[state] = self.config.nop
                max_exclusive_time = max(
                    self.config.max_excTime[state], max_exclusive_time
                )
                max_inclusvie_time = max(
                    self.config.max_incTime[state], max_exclusive_time
                )
                min_exclusive_time = min(
                    self.config.min_excTime[state], min_exclusive_time
                )
                min_inclusive_time = min(
                    self.config.min_incTime[state], min_inclusive_time
                )
        self.config.max_incTime["ensemble"] = max_inclusvie_time
        self.config.max_excTime["ensemble"] = max_exclusive_time
        self.config.min_incTime["ensemble"] = min_inclusive_time
        self.config.min_excTime["ensemble"] = min_exclusive_time

        return self.config
