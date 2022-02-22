'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import { console, object, ajax } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { MicroMetaPlainContainer, MicroMetaLoadingIndicator } from './MicroMetaPlainContainer';


/**
 * Accepts `microscopeItem` (MicroscopeConfiguration Item JSON) as a prop and loads in the full
 * representation from `microscopeItem.@id` if `microscopeItem.microscope` is not present before
 * instantiating a MicroMetaPlainContainer.
 */
export class MicroMetaAjaxLoadContainer extends React.PureComponent {

    static propTypes = {
        'microscopeItem': PropTypes.object,
        'height': PropTypes.number
    }

    constructor(props){
        super(props);
        this.getFullMicroscopeConfigItem = this.getFullMicroscopeConfigItem.bind(this);
        this.state = {
            'loading': false,
            'microscopeItem' : (props.microscopeItem && props.microscopeItem.microscope) ? props.microscopeItem : null
        };
        this.containerRef = React.createRef();
    }

    componentDidMount(){
        if (!this.state.microscopeItem) {
            this.getFullMicroscopeConfigItem();
        }
    }

    componentDidUpdate(pastProps){
        // After updating the component, load the new micro meta component if it changed.
        if (pastProps.microscopeItem !== this.props.microscopeItem){
            if (this.props.microscopeItem.viewconfig){
                this.setState({ 'microscopeItem' : this.props.microscopeItem });
            } else {
                this.getFullMicroscopeConfigItem();
            }
        }
    }

    /**
     * Retrieve the Micro Meta App Component, if it exists.
     *
     * @returns {object} The result of getMicroMetaAppComponent on the MicroMeta container. Or null if it doesn't exist.
     */
    getMicroMetaAppComponent(){
        return (this.containerRef && this.containerRef.current && this.containerRef.current.getMicroMetaAppComponent()) || null;
    }

    /**
    * Makes an AJAX call to get the Micro Meta microscope resource.
    */
    getFullMicroscopeConfigItem(){
        var { microscopeItem } = this.props;
        // Use the @id to make an AJAX request to get the Microscope Config Item.
        this.setState({ 'loading': true }, ()=>{
            // Use the @id to get the item, then remove the loading message
            ajax.load(object.itemUtil.atId(microscopeItem), (r)=>{
                this.setState({ 'microscopeItem' : r,'loading': false });
            });
        });
    }
    render(){
        const { microscopeItem, loading } = this.state;
        const { height } = this.props;

        /**
         * @todo: instance_height not implemented yet
         *  if height not defined by container then use instance defined value
         */
        // if (!height && microscopeItem && microscopeItem.instance_height && microscopeItem.instance_height > 0) {
        //     height = microscopeItem.instance_height;
        // }

        // Use the height to make placeholder message when loading.
        var placeholderStyle = { "height" : height || 800 };
        if (placeholderStyle.height >= 140) {
            placeholderStyle.paddingTop = (placeholderStyle.height / 2) - 40;
        }

        // If we're loading, show a loading screen
        if (loading){
            return <div className="text-center" style={placeholderStyle}><MicroMetaLoadingIndicator title="Loading" /></div>;
        }

        // Raise an error if there is no viewconfig
        if (!microscopeItem || !microscopeItem.microscope) {
            return (
                <div className="text-center" style={placeholderStyle}>
                    <MicroMetaLoadingIndicator icon="exclamation-triangle" title="No Microscope Config content found. Please go back or try again later." />
                </div>
            );
        }

        return <MicroMetaPlainContainer {..._.omit(this.props, 'microscopeItem', 'height')} microscopeConfig={microscopeItem.microscope} ref={this.containerRef} height={height} />;
    }
}
