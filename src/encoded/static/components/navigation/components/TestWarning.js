'use strict';

import React from 'react';

/** Component which displays a banner at top of page informing users about this portal containing test data. */
export class TestWarning extends React.PureComponent {

    /**
     * @public
     * @constant
     * @ignore
     */
    static defaultProps = {
        'infoIconStyle' : {
            'marginRight'   : 10,
            'marginTop'     : -2
        }
    }

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
        var { visible, infoIconStyle } = this.props;
        if (!visible) return null;
        return (
            <div className="test-warning">
                <div className="container">
                    <div>
                        <span style={{ fontSize : '13.5px' }}>
                            <i className="icon icon-fw icon-info circle-icon hidden-xs" style={infoIconStyle}/>
                            The data displayed on this page is not official and only for testing purposes.
                        </span>
                        <a className="test-warning-close icon icon-times" title="Hide" onClick={this.handleClose}/>
                    </div>
                </div>
            </div>
        );

    }

}
