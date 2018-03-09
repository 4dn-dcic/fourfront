'use strict';

export function wrapInAboveTablePanel(inner, title, className, closeButtonClickHandler){
    var closeButton = null;
    if (typeof closeButtonClickHandler === 'function'){
        closeButton = (
            <a className="close-button" onClick={closeButtonClickHandler}>
                <i className="icon icon-fw icon-angle-up"/>
            </a>
        );
    }
    return (
        <div className={"search-result-config-panel" + (className ? ' ' + className : '')}>
            <div className="inner">
                <h5 className="panel-title">{ title }{ closeButton }</h5>
                { inner }
            </div>
        </div>
    );
}
