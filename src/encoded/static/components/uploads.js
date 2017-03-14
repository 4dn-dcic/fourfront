'use strict';
var React = require('react');
var globals = require('./globals');
var _ = require('underscore');
var { ajax, console, object, isServerSide } = require('./util');
var ProgressBar = require('rc-progress').Line;

var Uploads = module.exports = React.createClass({
    uploadEntry: function(key, info){
        if(!info.display_title || !info.id || !info.total_size || !info.percent_done){
            return;
        }
        return(
            <li key={key} className="row" style={{"listStyle":"none"}}>
                <div className="col-sm-3" style={{'float':'left',"fontSize":"150%"}}>
                    <a href={info.id}>{info.display_title}</a>
                </div>
                <div className="col-sm-9" style={{'float':'right'}}>
                    <div>
                        <div style={{'float':'left'}}>{info.percent_done + "% complete"}</div>
                        <div style={{'float':'right'}}>{"Total size: " + info.total_size}</div>
                    </div>
                    <ProgressBar percent={info.percent_done} strokeWidth="1" strokeColor="#388a92" />
                </div>
            </li>);
    },


    render: function(){

        var uploadList = Object.keys(this.props.uploads).map((key) => this.uploadEntry(key, this.props.uploads[key]));
        // var uploadList = Object.keys(test).map((key) => this.uploadEntry(key, test[key]));
        return(
            <div>
                <h1 className="page-title">Current uploads</h1>
                <div className="item-page-heading">
                    <p className="text-larger">Please do not refresh or close this page while uploads are in progress.</p>
                </div>
                <ul style={{'paddingTop':'20px', "paddingLeft":'10px'}}>{uploadList}</ul>
            </div>
        );
    }
});

globals.content_views.register(Uploads, 'Uploads');
