'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';


export default class ScrollContainer extends React.Component {

    render(){
        var fullHeight = this.props.innerHeight + this.props.innerMargin.top + this.props.innerMargin.bottom;
        var fullWidth = this.props.innerWidth + this.props.innerMargin.left + this.props.innerMargin.right;
        console.log(fullHeight, this.props.verticalMargin);
        return (
            <div className="scroll-container-wrapper">
                <div className="scroll-container" style={{ 
                    'width' : Math.max(this.props.contentWidth, fullWidth),
                    'height': fullHeight,
                    'marginTop' : this.props.verticalMargin,
                    'marginBottom' : this.props.verticalMargin
                }}>
                {
                    React.Children.map(this.props.children, (child)=>{
                        return React.cloneElement(child, _.omit(this.props, 'children'));
                    })
                }
                </div>
            </div>
        );
    }

}
