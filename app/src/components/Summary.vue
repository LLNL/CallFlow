<template>
  <v-flex>
    <v-row>
      <v-col cols="5">
        <ConfigInformation
          v-if="Object.keys(config).length > 0"
          :data="config"
        />
      </v-col>
      <v-col cols="7">
        <ProfileInformation v-if="profiles.length > 0" :data="profiles" />
      </v-col>
    </v-row>
    <v-row>
      <!-- <TimeSeries ref="TimeSeries" :data="moduleCallsiteMap" /> -->
    </v-row>
  </v-flex>
</template>

<script>
import ConfigInformation from "./summary/config";
import ProfileInformation from "./summary/profile";
import TimeSeries from "./summary/timeSeries";
import moment from "moment";

export default {
	name: "Summary",
	components: {
		ConfigInformation,
		ProfileInformation,
		// TimeSeries,
	},
	props: ["config", "profiles"],
	data: () => ({
		moduleCallsiteMap: {},
	}),
	mounted() {
		document.title = "CallFlow - ";
	},

	methods: {
		init() {
			// Restrict to top n modules from the ensemble, if n < 10 then we would
			// default to n modules.
			const top_n_modules = this.sortByAttribute(this.$store.data_mod["ensemble"], "time", "mean", 10, this.$store.modules["ensemble"]);
			
			const objectMap = (obj, fn) => Object.fromEntries(Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)]));

			const remove_ensemble = objectMap(this.$store.data_mod, (_, x) => { if(x != "ensemble") return _; else return {};});
			delete remove_ensemble["ensemble"]; // Bring this back if we need to.

			// // Formulate the data for the module-wise summary information.
			this.moduleCallsiteMap = this.setModuleWiseInfo(
				remove_ensemble,
				this.$store.modules,
				"time (inc)",
				"mean",
				"time",
				top_n_modules
			);
		},

		/**
     	 * Per dataset information.
     	 */
		setModuleWiseInfo(data, module_idx, metric_type, info_type, sort_by, include_modules) {
			let ret = [];
			for (let [dataset, d] of Object.entries(data)) {
				let _r = {};
				_r["name"] = dataset;
				let total = 0;
				for (let [elem, _d] of Object.entries(d)) {
					const module_name = module_idx[dataset][elem];
					if(include_modules.includes(module_name)) {
						_r[module_idx[dataset][elem]] = _d[metric_type][info_type];
					}
					total += _d[metric_type][info_type];
				}
				// _r["time"] = moment(new Date(+(new Date()) -
				// Math.floor(Math.random()*10000000000)));
				_r["time"] = moment(dataset.split("_")[1]);
				_r["total"] = total;
				ret.push(_r);
			}
			return ret.sort((a, b) => b[sort_by] - a[sort_by]);
		},

		sortByAttribute(callsites, metric_type, info_type, top_n, module_idx) {
			let items = Object.keys(callsites).map( (key) => {
				return [key, callsites[key]];
			});
 
			items = items.sort( (first, second) => {
				return second[1][metric_type][info_type] - first[1][metric_type][info_type];
			});

			if(top_n < items.length) {
				items = items.slice(items.length - top_n);
			}

			callsites = items.reduce((lst, obj) => { lst.push(module_idx[obj[1]["name"]]); return lst; }, []);

			return callsites;
		},
	},
};
</script>