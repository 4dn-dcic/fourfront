import React, { Component } from 'react';
import PropTypes from 'prop-types';
//import Radium from 'radium';

class Cell extends Component {

	getClickHandler(data) {
		var { onClick } = this.props;
		if (!onClick) return false;
		return () => onClick(data);
	}

	getMouseOverHandler(data) {
		var { onMouseOver } = this.props;
		if (!onMouseOver) return false;
		return () => onMouseOver(data);
	}

	getMouseOutHandler(data) {
		var { onMouseOut } = this.props;
		if (!onMouseOut) return false;
		return () => onMouseOut(data);
	}

	getMouseEnterHandler(data) {
		var { onMouseOver } = this.props;
		if (!onMouseOver) return false;
		return () => onMouseOver(data);
	}

	getMouseLeaveHandler(data) {
		var { onMouseOut } = this.props;
		if (!onMouseOut) return false;
		return () => onMouseOut(data);
	}
	
	render() {
		var {data, style, className, tooltipDataFor} = this.props;
		var divProps = {
			'className' 	: className,
			'style' 		: style,
			'onClick' 		: this.getClickHandler(data),
			'onMouseOver' 	: this.getMouseOverHandler(data),
			'onMouseOut' 	: this.getMouseOutHandler(data),
			'onMouseEnter' 	: this.getMouseEnterHandler(data),
			'onMouseLeave' 	: this.getMouseLeaveHandler(data)
		};
		if (typeof data.className === 'string'){
			divProps.className = (divProps.className || '') + ' ' + data.className;
		}
		if (typeof data.tooltip !== 'undefined'){
			divProps['data-tip'] = data.tooltip;
			divProps['data-html'] = true;
			divProps['data-event-off'] = 'click';
			if (typeof tooltipDataFor === 'string'){
				divProps['data-for'] = tooltipDataFor;
			}
			if (typeof data.hasLinks === 'boolean' && data.hasLinks){
				divProps['data-class'] = "has-links-or-buttons";
			}
		}
		if (typeof data.content !== 'undefined'){
			divProps.children = data.content;
		}
		return <div {...divProps} />;
	}
}

Cell.propTypes = {
	data: PropTypes.object, // This cell's data
	style: PropTypes.object, // This cell's style object
	onClick: PropTypes.func, // This cell's click handler
	onMouseOver: PropTypes.func, // This cell's mouseover handler
	onMouseOut: PropTypes.func, // This cell's mouseout handler
	className: PropTypes.string, // Cell's class
};

export default Cell;//Radium(Cell); // Wraps Cell in Radium, which extends React's inline CSS capabilities
