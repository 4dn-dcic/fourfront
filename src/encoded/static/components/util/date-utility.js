'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { isServerSide } from './misc';




export class LocalizedTime extends React.Component {

    static defaultProps = {
        momentDate : null,
        timestamp : null,
        formatType : 'date-md',
        dateTimeSeparator : ' ',
        customOutputFormat : null,
        fallback : "N/A",
        className : "localized-date-time",
        localize : true
    }

    static propTypes = {
        momentDate : function(props, propName, componentName){
            if (props[propName] && !moment.isMoment(props[propName])){
                return new Error("momentDate must be an instance of Moment.");
            }
        },
        timestamp : PropTypes.string,
        formatType : PropTypes.string,
        dateTimeSeparator : PropTypes.string,
        customOutputFormat : PropTypes.string,
        fallback : PropTypes.string,
        className : PropTypes.string
    }

    constructor(props){
        super(props);
        this.state = {
            moment : props.momentDate ? props.momentDate :
                props.timestamp ? moment.utc(props.timestamp) : moment.utc(),
            mounted : false
        };
    }

    componentDidMount(){
        this.setState({ mounted : true });
    }

    render(){
        var { formatType, dateTimeSeparator, localize, customOutputFormat } = this.props;
        if (!this.state.mounted || isServerSide()) {
            return (
                <span className={this.props.className + ' utc'}>
                    { display(this.state.moment, formatType, dateTimeSeparator, false, customOutputFormat) }
                </span>
            );
        } else {
            return (
                <span className={this.props.className + (localize ? ' local' : ' utc')}>
                    { display(this.state.moment, formatType, dateTimeSeparator, localize, customOutputFormat) }
                </span>
            );
        }
    }

}

export function preset(formatType = 'date-md', dateTimeSeparator = " "){

    function date(ft){
        switch(ft){
            case 'date-file':
                return "YYYY-MM-DD";
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
            case 'date-month':
                // November 2016
                return "MMMM YYYY";
        }
    }

    function time(ft){
        switch(ft){
            case 'time-file':
                return "HH[h]-mm[m]";
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
}

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
export function format(timestamp, formatType = 'date-md', dateTimeSeparator = " ", localize = false, customOutputFormat = null){
    return display(moment.utc(timestamp), formatType, dateTimeSeparator, localize, customOutputFormat);
}

export function display(momentObj, formatType = 'date-md', dateTimeSeparator = " ", localize = false, customOutputFormat = null){
    var outputFormat;
    if (customOutputFormat) {
        outputFormat = customOutputFormat;
    } else {
        outputFormat = preset(formatType, dateTimeSeparator);
    }
    if (localize){
        return momentObj.local().format(outputFormat);
    }

    return momentObj.format(outputFormat);
}

/**
 * This function is meant to accept a UTC/GMT date string
 * and return a formatted version of it _without_ performing
 * any timezone conversion. Only returns year and (optionally)
 * month.
 *
 * @param {string} utcDate - UTC/system-formatted date string.
 * @param {boolean} [includeMonth] - If false, only year will be returned.
 * @return {string} Formatted year and possibly month.
 */
export function formatPublicationDate(utcDate, includeMonth = true, includeDay = true){
    var yearString, monthString, monthIndex, dayString, dayInteger;
    if (typeof utcDate !== 'string' || utcDate.length < 4){
        throw new Error('Expected a date string.');
    }
    yearString = utcDate.slice(0,4);
    if (includeMonth && utcDate.length >= 7){
        monthString = utcDate.slice(5,7);
        monthIndex = parseInt(monthString) - 1; // 0-based.
        // @see https://momentjs.com/docs/#/i18n/listing-months-weekdays/
        monthString = moment.months()[monthIndex];
        if (includeDay && utcDate.length >= 10){
            dayString = utcDate.slice(8, 10);
            dayInteger = parseInt(dayString);
            // @see https://momentjs.com/docs/#/i18n/locale-data/
            dayString = moment.localeData().ordinal(dayInteger);
            return monthString + ' ' + dayString + ', ' + yearString;
        }
        return monthString + ' ' + yearString;
    }
    return yearString;
}
