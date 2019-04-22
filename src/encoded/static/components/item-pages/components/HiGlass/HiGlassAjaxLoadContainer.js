'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { isServerSide, ajax, console, object } from './../../../util';
import { HiGlassPlainContainer, HiGlassLoadingIndicator } from './HiGlassPlainContainer';


/**
 * Accepts `higlassItem` (HiglassViewConfig Item JSON) as a prop and loads in the full
 * representation from `higlassItem.@id` if `higlassItem.viewconfig` is not present before
 * instantiating a HiGlassPlainContainer.
 */
export class HiGlassAjaxLoadContainer extends React.PureComponent {

    constructor(props){
        super(props);
        this.getFullHiglassItem = this.getFullHiglassItem.bind(this);
        this.state = {
            'loading': false,
            'higlassItem' : (props.higlassItem && props.higlassItem.viewconfig) ? props.higlassItem : null
        };
        this.containerRef = React.createRef();
    }

    componentDidMount(){
        if (!this.state.higlassItem) {
            this.getFullHiglassItem();
        }
    }

    componentDidUpdate(pastProps){
        // After updating the component, load the new higlass component if it changed.
        if (pastProps.higlassItem !== this.props.higlassItem){
            if (this.props.higlassItem.viewconfig){
                this.setState({ 'higlassItem' : this.props.higlassItem });
            } else {
                this.getFullHiglassItem();
            }
        }
    }

    /**
     * Retrieve the HiGlass Component, if it exists.
     *
     * @returns {object} The result of getHiGlassComponent on the HiGlass container. Or null if it doesn't exist.
     */
    getHiGlassComponent(){
        return (this.containerRef && this.containerRef.current && this.containerRef.current.getHiGlassComponent()) || null;
    }

    /**
    * Makes an AJAX call to get the Higlass viewconfig resource.
    */
    getFullHiglassItem(){
        var { higlassItem } = this.props;
        // Use the @id to make an AJAX request to get the HiGlass Item.
        this.setState({ 'loading': true }, ()=>{
            // Use the @id to get the item, then remove the loading message
            ajax.load(higlassItem['@id'], (r)=>{
                this.setState({ 'higlassItem' : r, 'loading': false });
            });
        });
    }
    render(){
        var { higlassItem, loading } = this.state;
        var { height } = this.props;

        // Use the height to make placeholder message when loading.
        var placeholderStyle = { "height" : height || 600 };
        if (placeholderStyle.height >= 140) {
            placeholderStyle.paddingTop = (placeholderStyle.height / 2) - 40;
        }

        // If we're loading, show a loading screen
        if (loading){
            return <div className="text-center" style={placeholderStyle}><HiGlassLoadingIndicator title="Loading" /></div>;
        }

        // Raise an error if there is no viewconfig
        if (!higlassItem || !higlassItem.viewconfig) {
            return <div className="text-center" style={placeholderStyle}><HiGlassLoadingIndicator icon="exclamation-triangle" title="No HiGlass content found. Please go back or try again later." /></div>;
        }

        // Pass the viewconfig to the HiGlassPlainContainer
        return <HiGlassPlainContainer {..._.omit(this.props, 'higlassItem')} viewConfig={higlassItem.viewconfig} ref={this.containerRef}/>;
    }
}
