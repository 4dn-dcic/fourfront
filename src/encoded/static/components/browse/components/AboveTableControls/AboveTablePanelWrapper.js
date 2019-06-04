'use strict';

import React from 'react';

export const AboveTablePanelWrapper = React.memo(function AboveTablePanelWrapper(props){
    const { children, title, className, onClose } = props;
    let closeButton = null;
    if (typeof onClose === 'function'){
        closeButton = (
            <a className="close-button" onClick={onClose}>
                <i className="icon icon-fw icon-angle-up"/>
            </a>
        );
    }
    return (
        <div className={"search-result-config-panel" + (className ? ' ' + className : '')}>
            <div className="inner">
                <h5 className="panel-title">{ title }{ closeButton }</h5>
                { children }
            </div>
        </div>
    );
});
