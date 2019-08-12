'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import DefaultItemView from './DefaultItemView';
//import { PedigreeTabView as PedigreeJSTabView } from './IndividualView';
import { console, layout, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { PedigreeViz } from './../viz/PedigreeViz';
import { CollapsibleItemViewButtonToolbar } from './components/CollapsibleItemViewButtonToolbar';
import url from 'url';

class AttachmentInput extends React.Component{

    constructor(props){
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(e){
        var attachment_props = {};
        const file = e.target.files[0];
        const { context, href } = this.props;
        const { host } = url.parse(href);
        const case_uuid = context.uuid;
        let config_uri;
        if (host.indexOf('localhost') > -1){
            config_uri = 'development.ini';
        }else{
            config_uri = 'production.ini';
        }
        attachment_props.type = file.type;
        attachment_props.download = file.name;
        if(file.size) {attachment_props.size = file.size;}
        var fileReader = new window.FileReader();
        fileReader.readAsText(file);
        fileReader.onloadend = function (e) {
            if(e.target.result){
                attachment_props.href = e.target.result;
                ajax.promise('/' + case_uuid + '/process-pedigree?config_uri=' + config_uri,
                    'PATCH', {}, JSON.stringify(attachment_props)).then((data) => {
                    console.log(data);
                });
            }else{
                alert('There was a problem reading the given file.');
                return;
            }
        }.bind(this);
    }

    render(){
        const attach_title = "Choose a file";
        const labelStyle = {
            'paddingRight':'5px',
            'paddingLeft':'5px'
        };

        return(
            <div>
                <input id={"test_pedigree"} type="file" onChange={this.handleChange} style={{ 'display':'none' }} accept="*/*"/>
                <button type="submit" className="btn btn-outline-dark">
                    <label className="text-400 mb-0" htmlFor={"test_pedigree"} style={labelStyle}>
                        { attach_title }
                    </label>
                </button>
            </div>
        );
    }
}


export default class CaseView extends DefaultItemView {

    getTabViewContents(){
        const { context : { proband = null } } = this.props;
        const initTabs = [];
        //if (proband){
        initTabs.push(PedigreeTabView.getTabObject(
            _.extend({}, this.props, { 'context' : proband })
        ));
        //}
        return this.getCommonTabs().concat(initTabs);
    }

    // Hacky McHackFace
    render(){
        return(
            <AttachmentInput {...this.props}/>
        );
    }
}
/*
return (
    <CollapsibleItemViewButtonToolbar constantButtons={this.fullScreenButton()} windowWidth={this.props.windowWidth}>
        { elems }
    </CollapsibleItemViewButtonToolbar>
);
*/
export const PedigreeTabView = React.memo(function PedigreeTabView(props){
    const { context, schemas, windowWidth, windowHeight, innerOverlaysContainer } = props;
    const width = layout.gridContainerWidth(windowWidth);
    const height = null;// Math.max(Math.floor(windowHeight / 2), 600);
    return (
        <div className="overflow-hidden">
            <h3 className="tab-section-title">
                <span>Pedigree</span>
            </h3>
            <hr className="tab-section-title-horiz-divider"/>
            <PedigreeViz {...{ width, height }} overlaysContainer={innerOverlaysContainer} />
        </div>
    );
});

PedigreeTabView.getTabObject = function(props){
    return {
        'tab' : <span><i className="icon icon-sitemap fas icon-fw"/> Pedigree</span>,
        'key' : 'pedigree',
        //'disabled' : !Array.isArray(context.experiments),
        'content' : <PedigreeTabView {...props} />
    };
};
