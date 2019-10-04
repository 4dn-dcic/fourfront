'use strict';

import React from 'react';
import _ from 'underscore';
//import MicroscopyMetadataTool from "4dn-microscopy-metadata-tool";
import { console, object, layout } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ItemFileAttachment } from './components/ItemFileAttachment';
import DefaultItemView from './DefaultItemView';


export default class MicroscopeConfigurationView extends DefaultItemView {

    getTabViewContents(){
        const initTabs = [];
        initTabs.push(MicroMetaTabView.getTabObject(this.props));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}




function onLoadSchema(complete) {
    // Maybe some UI to select something...
    // Not all browsers have `window.fetch`, used for demoing purposes.
    // Also, window.fetch requires HTTP so we getting this from GitHub... lol
    window
        .fetch(
            "https://raw.githubusercontent.com/WU-BIMAC/4DNMetadataSchemaXSD2JSONConverter/master/fullSchema.json"
        )
        .then(function(resp) {
            console.log(resp);
            return resp.text();
        })
        .then(function(respText) {
            var schema = JSON.parse(respText);
            complete(schema);
        });
}

function onLoadMicroscopes(complete) {
    const microscopesDB = {};
    complete(microscopesDB);
}

function onSaveMicroscope(microscope, complete) {
    // Do some stuff... show pane for people to browse/select schema.. etc.
    setTimeout(function() {
        console.log(microscope);
        complete(microscope.Name);
    });
}

const imagesPath = "https://raw.githubusercontent.com/WU-BIMAC/4DNMicroscopyMetadataToolReact/master/public/assets/";


let MicroscopyMetadataTool = null;

export class MicroMetaTabView extends React.PureComponent {

    static getTabObject(props){
        return {
            'tab' : <span><i className="icon icon-microscope fas icon-fw"/> MicroMeta</span>,
            'key' : 'micrometa',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>4DN MicroMeta</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <MicroMetaTabView {...props} />
                </div>
            )
        };
    }

    constructor(props){
        super(props);
        this.state = {
            mounted: false
        };
    }

    componentDidMount(){
        const onComplete = () => {
            this.setState({ mounted: true });
        };

        if (!MicroscopyMetadataTool) {
            setTimeout(()=>{
                // Load in HiGlass libraries as separate JS file due to large size.
                // @see https://webpack.js.org/api/module-methods/#requireensure
                require.ensure(['4dn-microscopy-metadata-tool'], (require) => {
                    MicroscopyMetadataTool = require('4dn-microscopy-metadata-tool').default;
                    onComplete();
                }, "microscopy-metadata-bundle");
            });
        } else {
            onComplete();
        }
    }

    render(){
        const { schemas, context, windowWidth, windowHeight } = this.props;
        const { mounted } = this.state;
        const tips = object.tipsFromSchema(schemas, context);
        const result = context;
        const width = layout.gridContainerWidth(windowWidth);
        const height = Math.max(windowHeight / 2, 600);

        if (!mounted){
            return (
                <div className="container text-center">
                    <i className="icon icon-spin icon-circle-notch fas text-larger mt-5"/>
                </div>
            );
        }

        const passProps = {
            width, height, onLoadMicroscopes, onLoadSchema, onSaveMicroscope, imagesPath
        };

        return (
            <div className="container px-0">
                <MicroscopyMetadataTool {...passProps} />
            </div>
        );
    }

}
