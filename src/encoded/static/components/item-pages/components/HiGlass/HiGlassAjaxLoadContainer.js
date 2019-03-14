'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { isServerSide, ajax, console, fileUtil } from './../../../util';
import { HiGlassPlainContainer } from './HiGlassPlainContainer';

/** This class will pass the HiGlass Item's viewconfig to the HiGlassPlainContainer, possibly using AJAX to get the information.*/
export class HiGlassAjaxLoadContainer extends React.PureComponent {

    constructor(props){
        super(props);

        this.state = {
            'loading': false,
            'higlassItem' : null
        }

        this.getFullHiglassItem = this.getFullHiglassItem.bind(this);
    }

    componentDidMount(){
        this.getFullHiglassItem();
    }

    componentDidUpdate(pastProps){
        // After updating the component, load the new higlass component if it changed.
        if (pastProps.higlassItem !== this.props.higlassItem){
            this.getFullHiglassItem();
        }
    }

    /**
    * Makes an AJAX call to get the Higlass viewconfig resource.
    */
    getFullHiglassItem(){
        var { higlassItem } = this.props;

        if (!higlassItem) {
            return;
        }

        // If the viewconfig was loaded already, use that
        if ("viewconfig" in higlassItem) {
            this.setState({'higlassItem': higlassItem, 'loading': false});
        }
        else if ('@id' in higlassItem) {
            // Use the @id to make an AJAX request to get the HiGlass Item.
            this.setState({ 'loading': true }, ()=>{
                // Use the @id to get the item, then remove the loading message
                ajax.load(this.props.higlassItem['@id'], (r)=>{
                    this.setState({ 'higlassItem' : r, 'loading': false });
                });
            });
        }
    }
    render(){
        var { higlassItem, loading } = this.state;
        var { height } = this.props;

        // Use the height to make placeholder message when loading.
        var placeholderStyle = {};
        if (typeof height === 'number' && height >= 140){
            placeholderStyle.height = height;
            placeholderStyle.paddingTop = (height / 2) - 40;
        }
        else if(typeof height !== 'number'){
            // If no height is given, assume defaults
            placeholderStyle.height = 600;
            placeholderStyle.paddingTop = (placeholderStyle.height / 2) - 40;
        }

        // If we're loading, show a loading screen
        if (loading){
            return <React.Fragment><div className="text-center" style={placeholderStyle}>
                    <h3>
                        <i className="icon icon-lg icon-television"/>
                    </h3>
                    Initializing
                </div></React.Fragment>
        }

        // Raise an error if there is no viewconfig
        if (!higlassItem || !higlassItem.viewconfig) {
            return <React.Fragment><div className="text-center" style={placeholderStyle}>
                    <h3>
                        <i className="icon icon-lg icon-exclamation-triangle"/>
                    </h3>
                    No HiGlass content found. Please go back or try again later.
                </div></React.Fragment>
        }

        // Pass the viewconfig to the HiGlassPlainContainer
        return <HiGlassPlainContainer {..._.omit(this.props, 'higlassItem')} viewConfig={higlassItem.viewconfig} />
    }
}
