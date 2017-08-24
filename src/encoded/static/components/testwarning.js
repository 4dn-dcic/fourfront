'use strict';

import React from 'react';

export default class TestWarning extends React.Component {
    render(){
        if (!this.props.visible) return null;
        return (
            <div className="test-warning">
                <div className="container">
                    <div>
                        <span style={{ fontSize : '13.5px' }}>
                            <i className="icon icon-fw icon-info circle-icon hidden-xs" style={{
                                marginRight : 10,
                                marginTop : -2
                            }}/>
                            The data displayed on this page is not official and only for testing purposes.
                        </span>
                        <a 
                            className="test-warning-close icon icon-times"
                            title="Hide"
                            onClick={function(e){
                                e.preventDefault();
                                e.stopPropagation();
                                if (this.props.setHidden){
                                    this.props.setHidden(e);
                                    return;
                                }
                            }.bind(this)}
                        />
                    </div>
                </div>
            </div>
        );

    }

}
