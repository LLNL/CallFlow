import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { observer, Provider } from 'mobx-react'

import goldenLayoutStore from '../store/goldenLayoutStore'

@observer
class TestComponent extends Component {
    render() {
	return (
		<Provider store={goldenLayoutStore}>
		<div id={this.props.id}> </div>
		</Provider>
	)
    }
}

export default TestComponent
