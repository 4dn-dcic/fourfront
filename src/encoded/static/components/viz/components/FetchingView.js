'use strict';

import React from 'react';

export class FetchingView extends React.Component {

    static defaultProps = {
        'display' : true
    }

    render(){
        return (
            <div className={"fetching-view" + (!this.props.display ? ' invisible' : '' )}>
                <div className="inner">
                    <i className="icon icon-spin icon-circle-o-notch"/>
                </div>
            </div>
        );
    }
}
