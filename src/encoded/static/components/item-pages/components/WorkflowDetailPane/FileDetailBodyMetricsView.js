'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';



export class ViewMetricButton extends React.Component {

    static defaultProps = {
        title : "View Full QC Report"
    }

    render(){
        var file = this.props.file;
        var node = this.props.node;
        var title = this.props.title || null;
        var type = file.overall_quality_status;
        if (!MetricsView.isNodeQCMetric(node)) return null;
        if (typeof file.url !== 'string') return null;

        var className = (this.props.className || '') + " btn download-button btn-default" + (this.props.disabled ? ' disabled' : '');
        if (typeof type === 'string'){
            if      (type.toLocaleLowerCase() === 'pass') className += ' btn-success';
            else if (type.toLocaleLowerCase() === 'warn') className += ' btn-warning';
            else if (type.toLocaleLowerCase() === 'error') className += ' btn-error';
            else className += ' btn-info';
        }

        return (
            <a href={file.url} className={className} target="_blank" onClick={(e)=>{
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

class MetricsViewItem extends React.Component {

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

export class MetricsView extends React.Component {

    static isNodeQCMetric(node){
        if (node.meta && node.meta.run_data && node.meta.run_data.type === 'quality_metric') return true;
    }

    static defaultProps = {
        'metrics' : [
            { 'key' : 'something', 'title' : 'Some Thing', 'result' : 'PASS' }
        ]
    }

    render(){
        return (
            <div className="metrics-view row">
                { this.props.metrics.map((m,i) => <MetricsViewItem metric={m} key={m.key || m.title || i} />) }
            </div>
        );
    }

}
