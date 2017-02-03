'use strict';

var moment = require('moment');
var { isServerSide } = require('./misc');

var DateUtility = module.exports = (function(){

    // ToDo : Handle locales (w/ moment)

    // Class itself, if need to create non-static instance at some point.
    var DateUtility = function(timestamp = null){};

    // Static Class Methods

    /**
     * Presets for date/time output formats for 4DN.
     * Uses bootstrap grid sizing name convention, so may utilize with responsiveGridState
     * to set responsively according to screen size, e.g. in a (debounced/delayed) window
     * resize event listener.
     *
     * @see responsiveGridState
     * @param {string} [formatType] - Key for date/time format to display. Defaults to 'date-md'.
     * @param {string} [dateTimeSeparator] - Separator between date and time if formatting a date-time. Defaults to ' '.
     */
    DateUtility.preset = function(formatType = 'date-md', dateTimeSeparator = " "){

        function date(ft){
            switch(ft){
                case 'date-xs':
                    // 11/03/2016
                    return "MM/DD/YYYY";
                case 'date-sm':
                    // Nov 3rd, 2016
                    return "MMM Do, YYYY";
                case 'date-md':
                    // November 3rd, 2016   (default)
                    return "MMMM Do, YYYY";
                case 'date-lg':
                    // Thursday, November 3rd, 2016
                    return "dddd, MMMM Do, YYYY";
            }
        }

        function time(ft){
            switch(ft){
                case 'time-xs':
                    // 12pm
                    return "ha";
                case 'time-sm':
                case 'time-md':
                    // 12:27pm
                    return "h:mma";
                case 'time-lg':
                    // 12:27:34 pm
                    return "h:mm:ss a";
            }
        }

        if (formatType.indexOf('date-time-') > -1){
            return date(formatType.replace('time-','')) + '[' + dateTimeSeparator + ']' + time(formatType.replace('date-',''));
        } else if (formatType.indexOf('date-') > -1){
            return date(formatType);
        } else if (formatType.indexOf('time-') > -1){
            return time(formatType);
        }
        return null;
    };

    DateUtility.display = function(momentObj, formatType = 'date-md', dateTimeSeparator = " ", localize = false, customOutputFormat = null){
        var outputFormat;
        if (customOutputFormat) {
            outputFormat = customOutputFormat;
        } else {
            outputFormat = DateUtility.preset(formatType, dateTimeSeparator);
        }
        if (localize){
            return momentObj.local().format(outputFormat);
        }

        return momentObj.format(outputFormat);
    };

    /**
     * Format a timestamp to pretty output. Uses moment.js, which uses Date() object in underlying code.
     * @see DateUtility.preset
     *
     * @param {string} timestamp - Timestamp as provided by server output. No timezone corrections currently.
     * @param {string} [formatType] - Preset format to use. Ignored if customOutputFormat is provided. Defaults to 'date-md', e.g. "October 31st, 2016".
     * @param {string} [dateTimeSeparator] - Separator between date & time if both are in preset formattype. Defaults to " ".
     * @param {boolean} [localize] - Output in local timezone instead of UTC.
     * @param {string} [customOutputFormat] - Custom format to use in lieu of formatType.
     * @return {string} Prettified date/time output.
     */

    DateUtility.format = function(timestamp, formatType = 'date-md', dateTimeSeparator = " ", localize = false, customOutputFormat = null){
        return DateUtility.display(moment.utc(timestamp), formatType, dateTimeSeparator, localize, customOutputFormat);
    };

    var React = require('react');

    DateUtility.LocalizedTime = React.createClass({
        
        propTypes : {
            momentDate : function(props, propName, componentName){
                if (props[propName] && !moment.isMoment(props[propName])){
                    return new Error("momentDate must be an instance of Moment.");
                }
            },
            timestamp : React.PropTypes.string,
            formatType : React.PropTypes.string,
            dateTimeSeparator : React.PropTypes.string,
            customOutputFormat : React.PropTypes.string,
            fallback : React.PropTypes.string,
            className : React.PropTypes.string
        },

        getDefaultProps: function(){
            return {
                momentDate : null,
                timestamp : null,
                formatType : 'date-md',
                dateTimeSeparator : ' ',
                customOutputFormat : null,
                fallback : "N/A",
                className : "localized-date-time"
            };
        },
        getInitialState : function(){
            return {
                moment : this.props.momentDate ? this.props.momentDate :
                    this.props.timestamp ? moment.utc(this.props.timestamp) : moment.utc(),
                mounted : false
            }
        },
        componentDidMount : function(){
            this.setState({ mounted : true });
        },
        render : function(){
            if (!this.state.mounted || isServerSide()) {
                return (
                    <span className={this.props.className + ' utc'}>{ 
                        DateUtility.display(
                            this.state.moment, 
                            this.props.formatType,
                            this.props.dateTimeSeparator,
                            false,
                            this.props.customOutputFormat
                        )
                    }</span>
                );
            } else {
                return (
                    <span className={this.props.className + ' local'}>{ 
                        DateUtility.display(
                            this.state.moment, 
                            this.props.formatType,
                            this.props.dateTimeSeparator,
                            true,
                            this.props.customOutputFormat
                        )
                    }</span>
                );
            }
        }
    });

    return DateUtility;
})();