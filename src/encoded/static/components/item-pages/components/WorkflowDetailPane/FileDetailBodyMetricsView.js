'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';



export class ViewMetricButton extends React.PureComponent {

    static defaultProps = {
        'title' : "View Full QC Report"
    };

    render(){
        var { file, node, title, className, disabled } = this.props,
            type = file.overall_quality_status,
            typeLowerCased = typeof type === 'string' && type.toLocaleLowerCase(),
            usedClassName = (className || '') + " btn download-button btn-default" + (disabled ? ' disabled' : '');

        if (typeof file.url !== 'string') return null;

        if (typeLowerCased){
            if      (typeLowerCased === 'pass') usedClassName += ' btn-success';
            else if (typeLowerCased === 'warn') usedClassName += ' btn-warning';
            else if (typeLowerCased === 'error') usedClassName += ' btn-error';
            else usedClassName += ' btn-info';
        }

        return (
            <a href={file.url} className={usedClassName} target="_blank" onClick={(e)=>{
                if (window && window.open){
                    e.preventDefault();
                    window.open(file.url, 'window', 'toolbar=no, menubar=no, resizable=yes, status=no, top=100, width=400');
                }
            }}>
                <i className="icon icon-fw icon-external-link" style={{ top : 1, position: 'relative' }}/>{ title ? <span>&nbsp; { title }</span> : null }
            </a>
        );
    }
}

class MetricsViewItem extends React.PureComponent {

    static resultStringToIcon(resultStr = "UNKNOWN", extraIconClassName = ''){
        if (typeof resultStr !== 'string') return resultStr;
        switch(resultStr.toUpperCase()){
            case 'PASS':
                return <i className={"icon icon-check " + extraIconClassName} data-tip={resultStr} />;
            case 'WARN':
                return <i className={"icon icon-warning " + extraIconClassName} data-tip={resultStr} />;
            case 'ERROR':
                return <i className={"icon icon-exclamation-circle " + extraIconClassName} data-tip={resultStr} />;
            default:
                return resultStr;
        }
    }

    render(){
        var m = this.props.metric;
        var title;
        if (m.key === 'overall_quality_status'){
            title = <strong className="text-600">{ m.title || "Overall QC Status" }</strong>;
        } else {
            title = <span>{ m.title || m.key }</span>;
        }
        return (
            <div className="col-xs-12 col-sm-6 col-lg-6 metrics-view-item">
                <div className="inner">
                    <div className="row">
                        <div className="col-xs-9">
                            { title }
                            {/* <TooltipInfoIconContainer title={m.title || m.key} tooltip={m.description} /> */}
                        </div>
                        <div className="col-xs-3 text-center">
                            { MetricsViewItem.resultStringToIcon(m.result) }
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export class MetricsView extends React.PureComponent {

    static defaultProps = {
        'metrics' : [
            { 'key' : 'something', 'title' : 'Some Thing', 'result' : 'PASS' }
        ]
    };

    render(){
        return (
            <div className="metrics-view row">
                { _.map(this.props.metrics, (m,i) => <MetricsViewItem metric={m} key={m.key || m.title || i} />) }
            </div>
        );
    }

}
