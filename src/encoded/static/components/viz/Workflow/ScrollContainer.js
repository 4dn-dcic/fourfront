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
        const { outerHeight } = this.props;
        if (outerHeight < prevProps.outerHeight){
            this.setState(({ isHeightDecreasing })=>{
                if (isHeightDecreasing) {
                    return null;
                }
                return { 'isHeightDecreasing' : true, 'pastHeight' : prevProps.outerHeight, outerHeight };
            });
            return;
        }

        if (outerHeight > prevProps.outerHeight){
            this.setState({ 'isHeightDecreasing' : false, 'pastHeight' : null, outerHeight });
            return;
        }

        if (!pastState.isHeightDecreasing && this.state.isHeightDecreasing){
            setTimeout(()=>{
                this.setState({ 'isHeightDecreasing' : false, 'pastHeight' : null, outerHeight });
            }, 500);
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
