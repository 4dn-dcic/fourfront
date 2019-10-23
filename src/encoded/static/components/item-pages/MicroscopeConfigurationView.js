'use strict';

import React from 'react';
import _ from 'underscore';
import { console, object, layout, ajax } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ItemFileAttachment } from './components/ItemFileAttachment';
import DefaultItemView from './DefaultItemView';


export default class MicroscopeConfigurationView extends DefaultItemView {

    getTabViewContents(){
        const initTabs = [];
        initTabs.push(MicroMetaTabView.getTabObject(this.props));
        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}


/**
 * @todo:
 * Make these be instance methods of MicroMetaTabView _or_ some other
 * component(s) & implement logic.
 * It might be useful to split into 2 components - 1 to handle logic &
 * render/clone out props.children with those functions, and
 * 1 to handle the view, but uncertain.
 */

/**
 * Likely won't change much, maybe just to use own `ajax.load`
 * instead of window.fetch. Can probably be kept as a static standalone
 * function for re-usability.
 */
function onLoadSchema(complete) {
    /*
    ajax.load(
        "https://raw.githubusercontent.com/WU-BIMAC/4DNMetadataSchemaXSD2JSONConverter/master/fullSchema.json",
        (res)=>{
            console.log("RES", res);
        },
        "GET",
        null,
        null,
        { },
        ["Content-Type", "Accept", "X-Requested-With"]
    );
    */
    ///*
    window.fetch = window.fetch || ajax.fetchPolyfill; // Browser compatibility polyfill
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
    // */
}

/**
 * Main function to implement
 * @todo Nothing in this view
 * Later, if on -collection- static page, present searchview to select a single microscope
 * and then pass in under a single key/value, e.g. `{ "SelectedItem" : ...the thing... }`
 */
function onLoadMicroscopes(complete) {
    const microscopesDB = {
        "Test" : { "hello" : "world" }
    };
    complete(microscopesDB);
}

/* Rough Idea for when on a static or collections page:
class StaticPageMicrometaWrapper extends React.PureComponent {
    constructor(props){
        super(props);
        this.state = {
            isSelecting: false
        };
        this.completeOnLoad = null;
    }
    onLoadMicroscopes(complete){
        this.setState({ isSelecting: true });
        this.completeOnLoad = complete;
    }
    onReceiveMicroscopeConfig(res){
        this.completeOnLoad(res);
    }
    render(){
        if (this.state.isSelecting) {
            return <LinkToSelector/>;
        }
}
*/

function onSaveMicroscope(microscope, complete) {
    // Do some stuff... show pane for people to browse/select schema.. etc.
    setTimeout(function() {
        console.log(microscope);
        complete(microscope.Name);
    });
}


/** Path to images directory/CDN. Once is published to NPM, will change to unpkg CDN URL. */
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
            width, height,
            onLoadMicroscopes,
            onLoadSchema,
            onSaveMicroscope,
            //visualizeImmediately: true,
            //loadedMicroscopeConfiguration: { ... },
            imagesPath
        };

        return (
            <div className="container px-0">
                <MicroscopyMetadataTool {...passProps} loadedMicroscopeConfiguration={context.microscope_setting} />
            </div>
        );
    }

}
