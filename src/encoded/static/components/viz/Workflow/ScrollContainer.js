'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';


export default class ScrollContainer extends React.PureComponent {

    constructor(props){
        super(props);
        this.state = {
            'mounted' : false,
            'isHeightDecreasing' : false,
            'outerHeight' : props.outerHeight,
            'pastHeight' : null
        };
        this.containerRef = React.createRef();
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    componentDidUpdate(prevProps, pastState){
        if (this.props.outerHeight < prevProps.outerHeight){
            this.setState(({ isHeightDecreasing })=>{
                if (isHeightDecreasing) {
                    return null;
                }
                return { 'isHeightDecreasing' : true, 'pastHeight' : prevProps.outerHeight, 'outerHeight' : this.props.outerHeight };
            });
            return;
        }

        if (this.props.outerHeight > prevProps.outerHeight){
            this.setState({ 'isHeightDecreasing' : false, 'pastHeight' : null, 'outerHeight' : this.props.outerHeight });
            return;
        }

        if (!pastState.isHeightDecreasing && this.state.isHeightDecreasing){
            setTimeout(()=>{
                this.setState({ 'isHeightDecreasing' : false, 'pastHeight' : null, 'outerHeight' : this.props.outerHeight });
            }, 500);
        }
    }

    render(){
        var { innerMargin, innerWidth, children, contentWidth, width } = this.props,
            { outerHeight, pastHeight, isHeightDecreasing } = this.state,
            innerCls = 'scroll-container' + (isHeightDecreasing ? ' height-decreasing' : '');

        return (
            <div className="scroll-container-wrapper" ref={this.containerRef} style={{ width }}>
                <div className={innerCls} style={{ 
                    'width' : Math.max(contentWidth, width),
                    'height': outerHeight,
                }}>
                {
                    React.Children.map(children, (child)=>{
                        return React.cloneElement(
                            child,
                            _.extend(
                                _.omit(this.props, 'children'),
                                {
                                    'scrollContainerWrapperElement' : this.containerRef.current || null,
                                    'scrollContainerWrapperMounted' : this.state.mounted,
                                    'outerHeight' : pastHeight || outerHeight
                                }
                            )
                        );
                    })
                }
                </div>
            </div>
        );
    }

}
