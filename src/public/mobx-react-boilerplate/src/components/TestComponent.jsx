import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'

@observer
class TestComponent extends React.Component {
    render() {
	return (
		<h1> { this.props.label } </h1>
	)
    }
}
