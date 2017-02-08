'use strict';

var React = require('react');
var _ = require('underscore');
var { ajax, console, isServerSide } = require('./util');

/**
 * Optional container of FormattedInfoBlocks, wrapping them in a <UL> and <LI> elements.
 * Encapsulates all required ajax/aggregation for fetching array of fields/data.
 * Available via FormattedInfoBlock.List
 * 
 * @param details (optional) - Array of complete details to display.
 * @param endpoints (required if details is blank) - Array of endpoints to AJAX details from.
 * @param renderItem (required) - Render function for items. Should return a FormattedInfoBlock component.
 * @param fallbackMsg (optional) - What to display if both details and endpoints don't exist or are empty.
 * @param propertyName (optional) - Descriptive unique ID of property/ies displayed.
 * @param ajaxCallback (optional) - Callback to execute with details, if/after they are fetched w/ AJAX. 
 */
var FormattedInfoBlockList = React.createClass({

    statics : {
        
        /**
         * Same functionality as @see FormattedInfoBlock.ajaxPropertyDetails, catered to a list.
         * Use (FormattedInfoBlock.List.ajaxPropertyDetails.)bind/call/apply and from another (e.g. parent) React component.
         * 
         * @param {string[]} endpoints - Array of endpoints to get data from.
         * @param {string} propertyName - A unique id to use as state property suffix for saving results, e.g. 'labs' for state.details_labs.
         * @param {function} [callback] - Optional callback, takes results as parameter.
         */
        ajaxPropertyDetails : function(endpoints, propertyName, callback = null){
            if (!Array.isArray(endpoints) || endpoints.length === 0) return false;

            var results = [];
            endpoints.forEach(function(endpoint, i){

                console.log('Obtaining ' + propertyName + '[' + i + '] via AJAX from ' + endpoint);
                ajax.load(endpoint + '?format=json&frame=embedded', function(result){
                    results[i] = result;
                    console.log('Obtained ' + propertyName + '[' + i + '] via AJAX.');
                    if (results.length == endpoints.length){
                        // All loaded
                        var newState = {};
                        newState['details_' + propertyName] = results;
                        this.setState(newState, ()=>{
                            if (typeof callback == 'function'){
                                callback(results);
                            }
                        });
                        console.log('Obtained details_'+ propertyName +' (' + results.length + ') via AJAX: ', results);
                    }
                }.bind(this), 'GET');
            }.bind(this));
        },

    },

    propTypes : {
        details : React.PropTypes.array,        // Complete detail data for all list items, if available.
        endpoints : React.PropTypes.array,      // Endpoints to use for fetching detail data. Required if details is empty.
        propertyName : React.PropTypes.string,  // Property from which array is gotten.
        renderItem : React.PropTypes.func,      // Function used to render child FormattedInfoBlocks
        ajaxCallback : React.PropTypes.func,    // Optional callback to invoke on recieving ajax'd data, taking results as a param.
        fallbackMsg : React.PropTypes.any,      // Fallback text or component(s) if endpoints not set.
        loading : React.PropTypes.bool,         // Override this.state.loading - only do so if providing details array prop.
        debug : React.PropTypes.bool            // Verbose lifecycle logging.
    },

    getDefaultProps : function(){
        return {
            propertyName : 'property',
            fallbackMsg : 'Not set'
        };
    },

    getInitialState : function(props = this.props){
        return _.extend(this.getInitialDetailsState(props), {
            loading : props.loading || (!this.propDetailsValid(props) && this.propEndpointsValid(props) ? true : null)
        });
    },

    getInitialDetailsState : function(props = this.props){
        var state = {};
        if (this.propDetailsValid(props)) {
            state['details_' + props.propertyName] = props.details;
        } else {
            state['details_' + props.propertyName] = null;
        }
        return state;
    },

    componentDidMount : function(){
        if (!this.state['details_' + this.props.propertyName] && this.propEndpointsValid()){
            FormattedInfoBlockList.ajaxPropertyDetails.call(this, this.props.endpoints, this.props.propertyName, (results) => {
                this.setState({ loading : false });
                if (typeof this.props.ajaxCallback === 'function') this.props.ajaxCallback(results);
            });
        }
        this.hasMounted = true;
    },

    componentWillReceiveProps : function(newProps){
        var stateChange = {};
        if (this.props.details !== newProps.details){
            stateChange = this.getInitialDetailsState(newProps);
        }
        if (this.props.loading !== newProps.loading && this.state.loading !== newProps.loading){
            stateChange.loading = newProps.loading;
        }
        this.setState(stateChange);
    },

    componentDidUpdate : function(prevProps, prevState){
        if (prevState.loading === true && this.state.loading === false && !this.state.transitionDelayElapsed){
            if (this.props.debug) console.info('FormattedInfoBlock.List > updated this.props.loading');
            
            if (this.hasMounted && !isServerSide()){
                setTimeout(()=>{
                    if (this.props.debug) console.info('FormattedInfoBlock.List > setting state.transitionDelayElapsed');
                    this.setState({ transitionDelayElapsed : true });
                }, 100);
            }
            
        }
    },

    propEndpointsValid : function(props = this.props){
        return props.endpoints && Array.isArray(props.endpoints) && props.endpoints.length > 0;
    },

    propDetailsValid : function(props = this.props){
        return (
            (props.details && Array.isArray(props.details) && props.details.length > 0) &&
            (!props.endpoints || (this.propEndpointsValid() && props.endpoints.length === props.details.length))
        );
    },

    render: function(){

        if (!this.propDetailsValid() && !this.propEndpointsValid() && !this.state.loading){
            return (
                <span className="not-set">{ this.props.fallbackMsg }</span>
            );
        }

        var blocks;

        if (this.state.loading) {
            blocks = ()=> ( this.props.endpoints || this.props.details || [null] ).map((item,i)=>
                <li key={this.props.propertyName + '-' + i} className={this.props.propertyName + "-item"}>
                    <i className="icon icon-spin icon-circle-o-notch"></i>
                </li>
            );
        } else if (this.state && this.state['details_' + this.props.propertyName]){
            blocks = ()=> this.state['details_' + this.props.propertyName].map((item,i) => {
                return (
                    <li key={this.props.propertyName + '-' + i} className={this.props.propertyName + "-item"}>
                        { this.props.renderItem(item) }
                    </li>
                );
            });
        }
        
        return (
            <ul
                className={
                    "formatted-info-panel-list" + 
                    (this.state.loading ? ' loading' : (this.state.loading === false ? ' loaded' : '')) +
                    (this.state.transitionDelayElapsed ? ' transitioned' : '')
                }
                id={this.props.propertyName}
            >{ blocks() }</ul>
        );
    }

});

var FormattedInfoBlock = module.exports = React.createClass({

    statics : {

        List : FormattedInfoBlockList, // Extension/wrapper component to house multiple blocks in a <UL> list.

        /**
         * Set a parent component's state to have 'details_' + propertyName data fetched via AJAX.
         * Must supply 'this' from parent component, via .call/.apply/.bind(this, args...),
         * AKA use like a mixin.
         * 
         * @param {string} endpoint - REST endpoint to get from. Usually a '@id' field in schema-derived JSON data.
         * @param {string} propertyName - The second part of state variable to save results into, after 'details_'. E.g. 'lab' for 'details_lab'.
         * @param {function} [callback] - Optional callback.
         * 
         * @example
         * componentDidMount : function(){
         *     if (typeof this.props.context.lab == 'string' && this.props.context.lab.length > 0){
         *         FormattedInfoBlock.ajaxPropertyDetails.call(this, this.props.context.lab, 'lab');
         *     }
         * },
         */
        ajaxPropertyDetails : function(endpoint, propertyName, callback = null){
            console.info('Obtaining details_' + propertyName + ' via AJAX.');
            ajax.load(endpoint + '?format=json&frame=embedded', function(result){
                var newStateAddition = {};
                newStateAddition['details_' + propertyName] = result;
                this.setState(newStateAddition, ()=>{
                    if (typeof callback == 'function'){
                        callback(result);
                    }
                });
                console.info('Obtained details_' + propertyName + ' via AJAX:', result);
            }.bind(this), 'GET', function(error){
                var newStateAddition = {};
                newStateAddition['details_' + propertyName] = {
                    'error' : true,
                    'body' : error
                };
                this.setState(newStateAddition);
            }.bind(this));
        },

        /**
         * Preset generator for Lab detail block.
         * @see FormattedInfoBlock.generate
         * 
         * @param {Object} details_lab - Object containing Lab Details.
         * @param {boolean|string} [includeIcon] - Include icon or not. Supply string to override default lab icon. Defaults to true.
         * @param {boolean} [includeLabel] - Include 'Lab >' label in top left corner, or not. Defaults to true.
         * @param {boolean} [includeDetail] - Include description/details or not. Defaults to true.
         * @param {string} [key] - Unique key to add to generated element, supply if generating a collection/array.
         */
        Lab : function(details_lab, includeIcon = true, includeLabel = true, includeDetail = true, key = null){
            if (details_lab && typeof details_lab.error !== 'undefined' && details_lab.error) {
                return FormattedInfoBlock.Error.apply(this, arguments);
            }
            return FormattedInfoBlock.generate(
                details_lab,
                typeof includeIcon == 'string' ? includeIcon : (includeIcon == true ? "icon-users" : null),
                includeLabel ? "Lab" : null,
                details_lab && includeDetail ?
                        (details_lab.city) + 
                        (details_lab.state ? ', ' + details_lab.state : '') + 
                        (details_lab.postal_code ? ' ' + details_lab.postal_code : '' ) +
                        (details_lab.country ? ', ' + details_lab.country : '')
                    : ( includeDetail ? true : null ),
                'lab',
                'address',
                key
            );
        },

        /**
         * Preset generator for Award detail block.
         * @see FormattedInfoBlock.Lab
         */
        Award : function(details_award, includeIcon = true, includeLabel = true, includeDetail = true, key = null){
            if (details_award && typeof details_award.error !== 'undefined' && details_award.error) {
                return FormattedInfoBlock.Error.apply(this, arguments);
            }
            return FormattedInfoBlock.generate(
                details_award,
                typeof includeIcon == 'string' ? includeIcon : (includeIcon == true ? "icon-institution" : null),
                includeLabel ? "Award" : null,
                details_award && includeDetail ? details_award.project : null,
                'award',
                'project',
                key
            );
        },

        Error : function(details_error, includeIcon = true, includeLabel = true, includeDetail = true, key = null){
            return FormattedInfoBlock.generate(
                details_error.body,
                typeof includeIcon == 'string' ? includeIcon : (includeIcon == true ? "icon-exclamation-circle" : null),
                includeLabel ? "Error" : null,
                details_error && details_error.body && includeDetail ? details_error.body.detail : null,
                'error-block',
                'error-message',
                key
            );
        },

        generate : function(detail, iconClass = null, label = null, contents = null, extraContainerClassName = null, extraDetailClassName = null, key = null){
            return (
                <FormattedInfoBlock
                    key={key}
                    label={label}
                    iconClass={iconClass}
                    title={detail ? detail.title : null }
                    titleHref={detail && detail['@id'] ? detail['@id'] : null }
                    extraContainerClassName={extraContainerClassName}
                    extraDetailClassName={extraDetailClassName}
                    loading={!detail}
                >
                    { contents }
                </FormattedInfoBlock>
            );
        }

    },

    propTypes : {
        label : React.PropTypes.string,
        iconClass : React.PropTypes.string,
        title : React.PropTypes.string,
        titleHref : React.PropTypes.string,
        detailContent : React.PropTypes.any,
        extraContainerClassName : React.PropTypes.string,
        extraDetailClassName : React.PropTypes.string,
        loading : React.PropTypes.bool,
        debug : React.PropTypes.bool    // Verbose log messages.
    },

    getDefaultProps : function(){
        return {
            label : null,
            title : null,
            titleHref : "#",
            detailContent : null,
            extraContainerClassName : null,
            extraDetailClassName : null,
            loading : false,
            children : null, // Inner contents of <FormattedInfoBlock>...</FormattedInfoBlock>
            debug : false
        };
    },

    hasMounted : false,

    componentDidMount : function(){
        if (this.props.debug) console.info('FormattedInfoBlock > Mounted');
        this.hasMounted = true;
    },

    getInitialState : function(){
        return {
            transitionDelayElapsed : !this.props.loading
        };
    },

    componentDidUpdate : function(prevProps, prevState){
        if (prevProps.loading === true && this.props.loading === false && !this.state.transitionDelayElapsed){
            if (this.props.debug) console.info('FormattedInfoBlock > updated this.props.loading');
            
            if (this.hasMounted && !isServerSide()){
                setTimeout(()=>{
                    if (this.props.debug) console.info('FormattedInfoBlock > setting state.transitionDelayElapsed');
                    this.setState({ transitionDelayElapsed : true });
                }, 100);
            }
            
        }
    },
    
    render : function(){
        var innerContent;

        var blockClassName = function(){
            var classes = ["formatted-info-panel"];
            if (!this.props.iconClass) classes.push('no-icon');
            if (!this.props.label) classes.push('no-label');
            if (this.props.detailContent == null && this.props.children == null) classes.push('no-details');
            if (!this.props.title) classes.push('no-title');
            if (this.props.loading) classes.push('loading');
            else classes.push('loaded');
            if (this.state.transitionDelayElapsed) classes.push('transitioned');         
            if (this.props.extraContainerClassName) classes.push(this.props.extraContainerClassName);
            return classes.join(' ');
        }.bind(this);

        if (this.props.loading) {
            innerContent = (
                <div className="row">
                    <div className="col-xs-12 text-center" style={{ color : '#d2d2d2', fontSize : '22px', paddingTop : 3 }}>
                        <i className="icon icon-spin icon-circle-o-notch"></i>
                    </div>
                </div>
            );
        } else {
            innerContent = (
                <div className="row loaded">
                    { this.props.iconClass ? 
                    <div className="col-xs-2 col-lg-1 icon-container">
                        <i className={"icon " + this.props.iconClass}></i>
                    </div>
                    : null }
                    <div className={"details-col " + (this.props.iconClass ? "col-xs-10 col-lg-11" : "col-sm-12") }>
                        { this.props.title ?
                        
                            this.props.titleHref ? 
                                <h5 className="block-title"><a href={ this.props.titleHref } title={this.props.title}>{ this.props.title }</a></h5>
                              : <h5 className="block-title no-link">{ this.props.title }</h5>
                        
                        : null }
                        { this.props.detailContent || this.props.children ?
                        <div className={"more-details " + this.props.extraDetailClassName}>
                            { this.props.detailContent || this.props.children }
                        </div>
                        : null }
                    </div>
                </div>
            );
        }
        return (
            <div className={ blockClassName() }>
                { this.props.label ? <h6 className="info-panel-label">{ this.props.label }</h6> : null }
                { innerContent }
            </div>
        );
    }

});
