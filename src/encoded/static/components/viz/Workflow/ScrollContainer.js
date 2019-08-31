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
        this.heightTimer = null;
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    componentDidUpdate(prevProps, pastState){
        const { outerHeight: updateOuterHeight } = this.props;
        if (updateOuterHeight < prevProps.outerHeight){
            this.setState(({ isHeightDecreasing })=>{
                return { 'isHeightDecreasing' : true, 'pastHeight' : prevProps.outerHeight, outerHeight: updateOuterHeight };
            }, ()=>{
                this.heightTimer && clearTimeout(this.heightTimer);
                this.heightTimer = setTimeout(()=>{
                    this.setState({ 'isHeightDecreasing' : false, 'pastHeight' : null, outerHeight: updateOuterHeight });
                }, 500);
            });
            return;
        }

        if (updateOuterHeight > prevProps.outerHeight){
            this.heightTimer && clearTimeout(this.heightTimer);
            this.setState({ 'isHeightDecreasing' : false, 'pastHeight' : null, outerHeight: updateOuterHeight });
            return;
        }
    }

    render(){
        const { innerMargin, innerWidth, children, contentWidth, width } = this.props;
        const { outerHeight, pastHeight, isHeightDecreasing, mounted } = this.state;
        const innerCls = 'scroll-container' + (isHeightDecreasing ? ' height-decreasing' : '');
        const innerStyle = { 'width' : Math.max(contentWidth, width), 'height': outerHeight };

        return (
            <div className="scroll-container-wrapper" ref={this.containerRef} style={{ width }}>
                <div className={innerCls} style={innerStyle}>
                    {
                        React.Children.map(children, (child)=>
                            React.cloneElement(
                                child,
                                _.extend(
                                    _.omit(this.props, 'children'),
                                    {
                                        'scrollContainerWrapperElement' : this.containerRef.current || null,
                                        'scrollContainerWrapperMounted' : mounted,
                                        'outerHeight' : pastHeight || outerHeight
                                    }
                                )
                            )
                        )
                    }
                </div>
            </div>
        );
    }

}
