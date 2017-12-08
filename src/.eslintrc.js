var OFF = 0, WARN = 1, ERROR = 2;

module.exports = {
    "extends": "airbnb-base",
    "rules":{
	"radix": OFF,
	"indent": [WARN, 4], 
        "no-mixed-spaces-and-tabs": OFF,
	"no-tabs": OFF,
	"no-use-before-define": OFF,
	"no-console": OFF,
	"max-len": OFF,
	"eqeqeq": OFF,
	"no-plusplus": OFF
    },
    "parserOptions": {
	"ecmaVersion": 6
    }
};
