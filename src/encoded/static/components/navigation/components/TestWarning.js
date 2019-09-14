'use strict';

import React from 'react';

/** Component which displays a banner at top of page informing users about this portal containing test data. */
export class TestWarning extends React.PureComponent {

    constructor(props){
        super(props);
        this.handleClose = this.handleClose.bind(this);
    }

    handleClose(evt){
        evt.preventDefault();
        evt.stopPropagation();
        if (typeof this.props.setHidden === 'function'){
            this.props.setHidden(evt);
            return;
        }
    }

    render(){
        const { visible } = this.props;
        if (!visible) return null;
        return (
            <div className="test-warning">
                <div className="container">
                    <div className="row">
                        <div className="col-10 text-container" style={{ fontSize : '13.5px' }}>
                            <i className="icon icon-fw icon-info-circle fas circle-icon d-none d-md-inline-block"/>
                            The data displayed on this page is not official and only for testing purposes.
                        </div>
                        <div className="col-2 close-button-container">
                            <a className="test-warning-close icon icon-times fas" title="Hide" onClick={this.handleClose}/>
                        </div>
                    </div>
                </div>
            </div>
        );

    }

}
