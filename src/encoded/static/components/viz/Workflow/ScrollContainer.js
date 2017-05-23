'use strict';

var React = require('react');
import PropTypes from 'prop-types';
var _ = require('underscore');


export default class ScrollContainer extends React.Component {

    render(){
        var fullHeight = this.props.innerHeight + this.props.innerMargin.top + this.props.innerMargin.bottom;
        var fullWidth = this.props.innerWidth + this.props.innerMargin.left + this.props.innerMargin.right;
        return (
            <div className="scroll-container-wrapper">
                <div className="scroll-container" style={{ width : Math.max(this.props.contentWidth, fullWidth), height: fullHeight }}>
                {
                    React.Children.map(this.props.children, (child)=>{
                        return React.cloneElement(child, _.omit(this.props, 'children'))
                    })
                }
                </div>
            </div>
        );
    }

}
