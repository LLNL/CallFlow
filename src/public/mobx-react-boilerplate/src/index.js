import React from "react"
import { render } from "react-dom"
import DevTools from "mobx-react-devtools"
import { apiClient } from 'mobx-rest'
import adapter from 'mobx-rest-fetch-adapter'

import Vis from "./components/Vis"

const apiPath = "http://localhost:8900"
apiClient(adapter, {apiPath})

render(
  <div>
    <DevTools />
    <Vis />
  </div>,
  document.getElementById("root")
);

// playing around in the console
//window.store = store;
