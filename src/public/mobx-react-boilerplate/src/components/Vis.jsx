import React, { Component } from "react";
import { observable, action } from "mobx";
import { observer } from "mobx-react";

import Todo from "./Todo";
import GoldenLayout from "./GoldenLayout";

@observer
class Vis extends React.Component {
    @observable newTodoTitle = "";

    render() {
	return (
	    <GoldenLayout />
	);
    }

    @action
    handleInputChange = e => {
	this.newTodoTitle = e.target.value;
    };

    @action
    handleFormSubmit = e => {
	this.props.store.addTodo(this.newTodoTitle);
	this.newTodoTitle = "";
	e.preventDefault();
    };
}

export default Vis
