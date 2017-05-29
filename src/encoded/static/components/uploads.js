'use strict';

var React = require('react');
import createReactClass from 'create-react-class';
var globals = require('./globals');
var _ = require('underscore');
var { ajax, console, object, isServerSide } = require('./util');
var ProgressBar = require('rc-progress').Line;

/*
Uploads component holds the s3 file upload managers generated in action.js.
State works where key is object ID of file, values are important object context and
upload info.
*/
var Uploads = module.exports = createReactClass({

    getInitialState: function(){
        var initial_uploads = {};
        var upload_keys = Object.keys(this.props.uploads);
        for(var i=0; i<upload_keys.length; i++){
            var this_upload = this.props.uploads[upload_keys[i]];
            var context_key = this_upload.context['@id'];
            var upload_info = this.buildUploadInfo(this_upload.context);
            initial_uploads[context_key] = upload_info;
            this.handleAsyncUpload(context_key, this_upload.manager);
        }
        return {'uploads': initial_uploads};
    },

    componentDidMount: function(){
        this._isMounted = true;
    },

    componentWillUnmount: function(){
        this._isMounted = false;
    },

    /*
    Run async upload and update state to reflect percentage uploaded
    */
    handleAsyncUpload: function(upload_key, upload_manager){
        upload_manager.on('httpUploadProgress',
            function(evt) {
                var percentage = Math.round((evt.loaded * 100) / evt.total);
                if(this._isMounted){
                    this.modifyRunningUploads(upload_key, percentage, evt.total);
                }
            }.bind(this))
            .send(function(err, data) {
                if(err){
                    // set status = upload_failed on an error
                    var props_uuid = this.props.uploads[upload_key]['context']['uuid'];
                    var put_body = {
                        'status': 'upload failed',
                        'uuid': props_uuid
                    };
                    if(this.props.uploads[upload_key]['context']['accession']){
                        put_body['accession'] = this.props.uploads[upload_key]['context']['accession'];
                    }
                    ajax.fetch(upload_key, {
                        method: 'PATCH',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(put_body)
                    })
                    .then(response => {
                        if (response.status && response.status !== 'success') throw response;
                        console.log('Status set to "upload failed" for ', upload_key);
                        return response;
                    },
                    error => {
                        console.log('Error setting status to "upload failed" for ', upload_key);
                    });
                    var new_uploads = _.extend({}, this.state.uploads);
                    delete new_uploads[upload_key];
                    // update state
                    this.setState({'uploads': new_uploads});
                    // delete upload from app state
                    this.props.updateUploads(upload_key, null, true);
                    alert("File upload failed for " + upload_key);
                }else{
                    // percentage = 101 means upload is complete
                    if(this._isMounted){
                        this.modifyRunningUploads(upload_key, 101, null);
                    }
                    this.props.updateUploads(upload_key, null, true);
                    alert("File uploaded successfully for " + upload_key);
                }
            }.bind(this));
    },

    /*
    Set state to reflect new upload percentage for the given upload (key: @id)
    */
    modifyRunningUploads: function(upload_key, percentage, size){
        var new_uploads = _.extend({}, this.state.uploads);
        new_uploads[upload_key]['percent_done'] = percentage;
        if(size){
            new_uploads[upload_key]['total_size'] = size;
        }
        this.setState({'uploads': new_uploads});
    },

    buildUploadInfo: function(context){
        var file_title = context.filename ? context.filename : context.display_title;
        var upload_info = {
            'id': context['@id'],
            'display_title': file_title,
            'total_size': 0,
            'percent_done': -1
        };
        return upload_info;
    },

    /*
    Remove an upload from state and also from app state
    */
    abortUpload: function(abort_key){
        var upload_keys = Object.keys(this.props.uploads);
        for(var i=0; i<upload_keys.length; i++){
            var this_upload = this.props.uploads[upload_keys[i]];
            if(abort_key == this_upload.context['@id'] && abort_key == upload_keys[i]){
                this_upload.manager.abort();
                break;
            }
        }
    },

    /*
    Build JSX for each upload with an upload bar, filename, and total file size
    */
    uploadEntry: function(key, info){
        if(!info.display_title || !info.id || !info.total_size || !info.percent_done || key != info.id){
            return;
        }
        // to handle 101% for completed uploads
        var use_percent = info.percent_done == 101 ? 100 : info.percent_done;
        return(
            <li key={key} className="row" style={{"listStyle":"none"}}>
                <div className="col-sm-3" style={{'float':'left'}}>
                    <a href={info.id}>{info.display_title}</a>
                    {info.percent_done !== 101 ?
                        <a href="#" style={{'color':'#a94442','paddingLeft':'10px'}} onClick={function(e){
                            e.preventDefault();
                            this.abortUpload(key);
                        }.bind(this)} title="Cancel">
                            <i className="icon icon-times-circle-o icon-fw"></i>
                        </a>
                    :
                    null}
                </div>
                <div className="col-sm-9" style={{'float':'right'}}>
                    <div>
                        <div style={{'float':'left'}}>{use_percent + "% complete"}</div>
                        <div style={{'float':'right'}}>{"Total size: " + info.total_size}</div>
                    </div>
                    <ProgressBar percent={use_percent} strokeWidth="1" strokeColor="#388a92" />
                </div>
            </li>);
    },

    /*
    Create JSX for info box on the uploads page; changes depending on whether
    uploads are running, finished, or there are no uploads.
    */
    uploadPageInfo: function(){
        var upload_message = 'Your running uploads appear here. Currently there are none.';
        var upload_style = {'backgroundColor':'#f4f4f4'};
        if(Object.keys(this.state.uploads).length > 0){
            var upload_statuses = Object.keys(this.state.uploads).map((key) => this.checkUploadStatus(this.state.uploads[key]));
            var completed = 0;
            var initialized = 0;
            for(var i=0; i<upload_statuses.length; i++){
                if(upload_statuses[i] == 'running'){
                    upload_message = 'You having running uploads. Please do not refresh or close this page, or navigate to a manually typed URL.';
                    upload_style = {'backgroundColor':'#ebccd1'}; //red
                    break;
                }else if(upload_statuses[i] == 'complete'){
                    completed += 1;
                }else if(upload_statuses[i] == 'initializing'){
                    initialized += 1;
                }
            }
            if(completed > 0 && (initialized + completed) == upload_statuses.length){
                upload_message = 'Your uploads are complete! You may safely refresh or close this page.';
                upload_style = {'backgroundColor':'#dff0d8'}; //green
            }
        }
        return(
            <div className="flexible-description-box item-page-heading" style={upload_style}>
                <p className="text-larger">{upload_message}</p>
            </div>
        );
    },

    /*
    Check percent done for an upload, return status. 101 means upload complete, -1 meanst
    that the upload is initializing.
    */
    checkUploadStatus: function(upload){
        if(upload.percent_done && upload.percent_done == 101){
            return 'complete';
        }if(upload.percent_done && upload.percent_done == -1){
            return 'initializing';
        }else{
            return 'running';
        }
    },

    render: function(){
        var uploadList = Object.keys(this.state.uploads).map((key) => this.uploadEntry(key, this.state.uploads[key]));
        return(
            <div>
                <h1 className="page-title">Current uploads</h1>
                {this.uploadPageInfo()}
                <ul style={{'paddingTop':'20px', "paddingLeft":'10px'}}>{uploadList}</ul>
            </div>
        );
    }
});

globals.content_views.register(Uploads, 'Uploads');
