import React from 'react'
import { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

export default class TestComponent extends Component {
    render() {
	return (
		<h1> { this.props.label } </h1>
	)
    }
}


