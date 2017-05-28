import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { columnStyle } from './Styles.js';

export default class Column extends Component {
	render() {
		return (
			<div className={this.props.className} style={columnStyle}>
				{this.props.cells}
			</div>
		);
	}
}

Column.propTypes = {
	cells: PropTypes.array, // An array of Cell components, representing a column
	className: PropTypes.string, // Column's class
};

