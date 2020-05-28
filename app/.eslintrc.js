module.exports = {
	"env": {
		"browser": true,
		"es6": true
	},
	"extends": [
		"eslint:recommended",
		"plugin:vue/essential"
	],
	"globals": {
		"Atomics": "readonly",
		"SharedArrayBuffer": "readonly"
	},
	"parserOptions": {
		"ecmaVersion": 2018,
		"sourceType": "module"
	},
	"plugins": [
		"vue"
	],
	"overrides": [
		{
			"files": ["node_modules/*", "src/thirdParty/*", "src/unused/*"],
			"rules": {
				"require-jsdoc": "off"
			}
		}
	],
	"rules": {
		"indent": [
			"error",
			"tab"
		],
		"linebreak-style": [
			"error",
			"unix"
		],
		"quotes": [
			"error",
			"double"
		],
		"semi": [
			"error",
			"always"
		],
		"no-unused-vars": "off",
		"no-console": "off",
		"global-require": "off",
		"no-prototype-builtins": "off",
	}
};