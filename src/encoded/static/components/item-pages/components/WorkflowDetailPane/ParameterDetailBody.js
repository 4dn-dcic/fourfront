'use strict';

import React from 'react';


export const ParameterDetailBody = React.memo(function ParameterDetailBody({ node, minHeight }){
    return (
        <div style={typeof minHeight === 'number' ? { minHeight } : null}>
            <div className="information">
                <div className="row">

                    <div className="col col-sm-4 box">
                        <span className="text-600">Parameter Name</span>
                        <h3 className="text-300 text-ellipsis-container">{ node.name || node.meta.name }</h3>
                    </div>

                    <div className="col-sm-8 box">
                        <span className="text-600">Value Used</span>
                        <h4 className="text-300 text-ellipsis-container">
                            <code>{ node.meta.run_data.value }</code>
                        </h4>
                    </div>

                </div>
            </div>
            <hr/>
        </div>
    );
});

