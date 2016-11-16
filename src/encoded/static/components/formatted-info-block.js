'use strict';

var React = require('react');
var { ajaxLoad, isServerSide, console } = require('./objectutils');

var FormattedInfoBlock = module.exports = React.createClass({

    statics : {
        /**
         * Set a parent component's state to have 'details_' + propertyName data fetched via AJAX.
         * Must supply 'this' from parent component, via .call/.apply/.bind(this, args...),
         * AKA use like a mixin.
         * 
         * @param {string} endpoint - REST endpoint to get from. Usually a '@id' field in schema-derived JSON data.
         * @param {string} propertyName - The second part of state variable to load into, after 'details_'. E.g. 'lab' for 'details_lab'.
         * 
         * @example
         * componentDidMount : function(){
         *     if (typeof this.props.context.lab == 'string' && this.props.context.lab.length > 0){
         *         FormattedInfoBlock.ajaxPropertyDetails.call(this, this.props.context.lab, 'lab');
         *     }
         * },
         */
        ajaxPropertyDetails : function(endpoint, propertyName){
            console.info('Obtaining details_' + propertyName + ' via AJAX.');
            ajaxLoad(endpoint + '?format=json', function(result){
                var newStateAddition = {};
                newStateAddition['details_' + propertyName] = result;
                this.setState(newStateAddition);
                console.info('Obtained details_' + propertyName + ' via AJAX.');
            }.bind(this), 'GET');
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

        generate : function(detail, iconClass = null, label = null, contents = null, extraContainerClassName = null, extraDetailClassName = null, key = null){
            return (
                <FormattedInfoBlock
                    key={key}
                    label={label}
                    iconClass={iconClass}
                    title={detail ? detail.title : null }
                    titleHref={detail ? detail['@id'] : null }
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
        loading : React.PropTypes.bool
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
            children : null // Inner contents of <FormattedInfoBlock>...</FormattedInfoBlock>
        };
    },

    hasMounted : false,

    componentDidMount : function(){
        console.info('FormattedInfoBlock > Mounted');
        this.hasMounted = true;
    },

    getInitialState : function(){
        return {
            transitionDelayElapsed : !this.props.loading
        };
    },

    componentDidUpdate : function(prevProps, prevState){
        if (prevProps.loading === true && this.props.loading === false && !this.state.transitionDelayElapsed){
            console.info('FormattedInfoBlock > updated this.props.loading');
            
            if (this.hasMounted && !isServerSide()){
                setTimeout(()=>{
                    console.info('FormattedInfoBlock > setting state.transitionDelayElapsed');
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