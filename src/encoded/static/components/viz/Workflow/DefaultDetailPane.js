'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import JSONTree from 'react-json-tree';


export default class DefaultDetailPane extends React.Component {

    static propTypes = {
        'selectedNode' : PropTypes.oneOfType([ PropTypes.object, PropTypes.oneOf([null]) ])
    }

    static defaultProps = {
        'selectedNode' : null
    }

    render(){
        var node = this.props.selectedNode;
        if (!node) return null;

        var type;
        if (node.type === 'step'){
            type = 'Analysis Step';
        } else {
            type = node.format || node.type;
        }

        return (
            <div className="detail-pane">
                <h5 className="text-500">
                    { type }
                </h5>
                <h4 className="text-300">
                    <span>{ node.name }</span>
                </h4>
                <div className="detail-pane-body">
                    <JSONTree data={node.meta} />
                </div>
            </div>
        );
    }

}
