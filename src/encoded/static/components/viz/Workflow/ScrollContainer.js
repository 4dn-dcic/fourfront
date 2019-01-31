'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';


export default class ScrollContainer extends React.PureComponent {

    constructor(props){
        super(props);
        this.state = { 'mounted' : false };
        this.containerRef = React.createRef();
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    render(){
        var { outerHeight, innerMargin, innerWidth, children, contentWidth, width } = this.props;

        return (
            <div className="scroll-container-wrapper" ref={this.containerRef} style={{ width }}>
                <div className="scroll-container" style={{ 
                    'width' : Math.max(contentWidth, width),
                    'height': outerHeight,
                }}>
                {
                    React.Children.map(children, (child)=>{
                        return React.cloneElement(
                            child,
                            _.extend(
                                {
                                    'scrollContainerWrapperElement' : this.containerRef.current || null,
                                    'scrollContainerWrapperMounted' : this.state.mounted
                                },
                                _.omit(this.props, 'children')
                            )
                        );
                    })
                }
                </div>
            </div>
        );
    }

}
