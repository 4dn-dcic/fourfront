'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { isServerSide, ajax, console, fileUtil } from './../../../util';
import { HiGlassPlainContainer } from './HiGlassPlainContainer';

export class HiGlassAjaxLoadContainer extends React.PureComponent {
    /** This class passes
    */

    constructor(props){
        super(props);

        this.state = {
            'loading': false,
            'higlassItem' : null
        }

        this.doLoad = this.doLoad.bind(this);
    }

    componentDidMount(){
        this.doLoad();
    }

    componentDidUpdate(pastProps){
        // After updating the component, load the new higlass component if it changed.
        if (pastProps.higlassItem !== this.props.higlassItem){
            this.doLoad();
        }
    }
    doLoad(){
        var { higlassItem } = this.props;

        if (!higlassItem) {
            return;
        }

        // If it has a viewconfig, use that
        if ("viewconfig" in higlassItem) {
            this.setState({'higlassItem': higlassItem, 'loading': false});
        }
        else if ('@id' in higlassItem) {
            // If it has an @id, set the loading flag and make an ajax call to load it.
            this.setState({ 'loading': true }, ()=>{
                // Use the @id to get the item, then remove the loading screen
                ajax.load(this.props.higlassItem['@id'], (r)=>{
                    this.setState({ 'higlassItem' : r, 'loading': false });
                });
            });
        }
    }
    render(){
        var {higlassItem, loading} = this.state;

        // If we're loading, show a loading screen
        if (loading){
            // Maybe could look exactly like HiglassPlainContainer loading indicator -- maybe could split out HiglassPlainContainer's 'loading indicator' markup into reusable component, idk
            return <React.Fragment><div>LOADING</div></React.Fragment>
        }

        // Raise an error if there is no viewconfig
        if (!higlassItem || !higlassItem.viewconfig) {
            return <React.Fragment><div>ERROR</div></React.Fragment> //TODO ...some..error..msg..;
        }

        // Pass the viewconfig to the HiGlassPlainContainer
        return <HiGlassPlainContainer {..._.omit(this.props, 'higlassItem')} viewConfig={higlassItem.viewconfig} />
    }
}
