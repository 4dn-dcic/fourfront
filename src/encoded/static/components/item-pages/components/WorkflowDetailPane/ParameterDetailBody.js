'use strict';

import React from 'react';

export class ParameterDetailBody extends React.Component {
    
    parameterName(){
        var node = this.props.node;
        return (
            <div className="col-sm-4 box">
                <span className="text-600">Parameter Name</span>
                <h3 className="text-300 text-ellipsis-container">{ node.name || node.meta.name }</h3>
            </div>
        );
    }

    parameterValue(){
        var node = this.props.node;
        return (
            <div className="col-sm-8 box">
                <span className="text-600">Value Used</span>
                <h4 className="text-300 text-ellipsis-container">
                    <code>{ node.meta.run_data.value }</code>
                </h4>
            </div>
        );
    }

    render(){
        var node = this.props.node;
        return (
            <div style={typeof this.props.minHeight === 'number' ? { minHeight : this.props.minHeight } : null}>
                <div className="information">
                    <div className="row">
                        { this.parameterName() }
                        { this.parameterValue() }
                    </div>
                </div>
                <hr/>
            </div>
        );
    }
}