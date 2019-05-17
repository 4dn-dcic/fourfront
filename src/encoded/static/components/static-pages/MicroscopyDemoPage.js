'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, navigate, layout } from'./../util';
//import MicroscopeMetadataTool from "4dn-microscopy-metadata-tool";

// We will use code-splitting to load this upon componentDidMount in the parent component
// which uses/renders it. This helps avoid making the entire JS bundle too big.
let MicroscopeMetadataTool = null;



/**
 * Page to show Microscopy Demo. Used as interim homepage on this branch.
 * Later, many parts of this to be merged to master (MANUALLY) and this likely
 * put/moved to own separete page.
 *
 * @todo
 * A `context` prop is passed to most page views incl. this one which represents
 * API response at 'this' endpoint (whatever it might be, '/' for case of homepage).
 * Once is on own page (e.g. not homepage), we could just return the schemas needed
 * as part of API response for endpoint at which this component would be displayed
 * and have them available without needing to AJAX load in stuff.
 *
 * @prop {Object} context - Should have properties typically needed for any static page.
 */
export default class MicroscopyDemoPage extends React.PureComponent {

    static defaultProps = {

    };

    /**
     * Our system generates/transforms schemas to add calculated properties and stuff to it.
     * Here we might need to clear them out or something.
     * Also, return the proper ones instead of _all_ the ones in DB.
     */
    static getMicroscopySchemas(allschemas){

    }

    constructor(props){
        super(props);
        this.state = { 'componentIsAvailable' : false };
    }

    /** Load in microscopy component */
    componentDidMount(){
        // TODO CHANGE PATH(S) AFTER DEBUGGING
        require.ensure(['4dn-microscopy-metadata-tool/dist/MicroscopyMetadataTool.dev.js'], (require) => {
            const loadedBundle = require('4dn-microscopy-metadata-tool/dist/MicroscopyMetadataTool.dev.js');
            MicroscopeMetadataTool = loadedBundle.default;
            this.setState({ 'componentIsAvailable' : true });
        }, "4dn-microscopy-metadata-tools-bundle");
    }

    /**
     * @todo
     * Not sure yet.
     * Perhaps pass in hardcoded/pre-existing schemas.
     * And/or could AJAX load them in in background, save to state, then pass in.
     * ... or utilize this func to ajax load in.
     *
     * @param {function} complete - To be called when async function complete.
     */
    onLoadSchema(complete){

    }

    /**
     * @todo
     * Use LinkToSelector component to launch window to search for microscopes
     * that exist in DB.
     *
     * @param {function} complete - To be called when async function complete.
     */
    onLoadMicroscopes(complete){

    }

    /**
     * @todo
     * POST new micropscope. Or PUT it (to replace existing 1 of same ID).
     * Something or other.
     *
     * @todo
     * Perhaps validate and/or ensure matches schema etc.
     *
     * @param {function} complete - To be called when async function complete.
     * @param {Object} microscope - Microscope data to be POSTed.
     */
    onSaveMicroscope(complete, microscope){

    }

    /**
     * props.schemas are passed in from higher-level app and we can grab what we need from it more less.
     * may need to transform a little bit.
     */
    render(){
        const { windowWidth, windowHeight, schemas } = this.props;
        const { componentIsAvailable } = this.state;

        if (!componentIsAvailable || !schemas) {
            // We don't know window dimensions yet because is rendered server-side
            // doesn't offer SEO benefit so show a placeholder temporarily.
            return (
                <div className="container home-content-area" id="content">
                    <div className="placeholder-until-loaded text-center">
                        <i className="icon icon-fw icon-circle-o-notch icon-spin mt-5 mb-5"/>
                    </div>
                </div>
            );
        }

        const dims = {
            'width' : layout.gridContainerWidth(windowWidth),
            'height' : Math.max(windowHeight - 200, 600)
        };

        return (
            <div className="container home-content-area" id="content">
                <MicroscopeMetadataTool
                    width={dims.width}
                    height={dims.height}
                    onLoadSchema={this.onLoadSchema}
                    onLoadMicroscopes={this.onLoadMicroscopes}
                    onSaveMicroscope={this.onSaveMicroscope}
                    // TODO: populate _or_, once on NPM, we could literally
                    // just use its CDN (unpkg) to grab without needing to save/copy
                    // files over to own repo, e.g.
                    // https://unpkg.com/4dn-microscopy-metadata-tool/public/assets/
                    imagesPath="/static/img/microscopy-assets/"
                />
            </div>
        );

    }

}

