import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import './index.css'
import Vis from './Components/Vis'
import store from './store.js'

import registerServiceWorker from './registerServiceWorker'

const root = document.getElementById('root')

ReactDOM.render(<Provider store={store}>
		<Vis />
		</Provider>, root);
registerServiceWorker();
