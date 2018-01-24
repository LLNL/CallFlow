import React from "react"
import { render } from "react-dom"
import DevTools from "mobx-react-devtools"
import adapter from 'mobx-rest-fetch-adapter'
import { Provider } from 'mobx-react'
import GoldenLayout from 'golden-layout'
import GoldenLayoutWrapper from './components/GoldenLayout'
//import promiseFinally from 'promise.prototype.finally'

import './index.css'

import Vis from "./components/Vis"

import sankeyStore from './store/sankeyStore'
import goldenLayoutStore from './store/goldenLayoutStore'

const stores = {
    sankeyStore,
    goldenLayoutStore
}

window.store = stores;

//promiseFinally.shim();

render(
	<Provider {...stores} >
	<GoldenLayoutWrapper />
	</Provider>,
    document.getElementById("root")
);


