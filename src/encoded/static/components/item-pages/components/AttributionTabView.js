'use strict';

import React from 'react';
import _ from 'underscore';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import { FormattedInfoBlock } from './FormattedInfoBlock';
import { Publications } from './Publications';
import { object } from './../../util';

export class AttributionTabView extends React.Component {

    static getTabObject(context){
        return {
            tab : <span><i className="icon icon-users icon-fw"/> Attribution</span>,
            key : "attribution",
            disabled : (!context.lab && !context.award && !context.submitted_by),
            content : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Attribution</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <AttributionTabView context={context} />
                </div>
            )
        };
    }

    static isAllInfoInProps(props){
        return (props.labInfo && props.awardInfo && props.userInfo);
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.getAttributionInfo = this.getAttributionInfo.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillMount = this.componentWillMount.bind(this);
        this.setLinkedDetails = this.setLinkedDetails.bind(this);
        this.getEmbeddedPropertyDetailsFromExperiments = this.getEmbeddedPropertyDetailsFromExperiments.bind(this);
        if (!AttributionTabView.isAllInfoInProps(props)){
            this.state = {};
        }
    }

    componentWillMount(){
        if (AttributionTabView.isAllInfoInProps(this.props)) return null;
        this.setLinkedDetails(false);
    }

    componentDidMount(){
        if (AttributionTabView.isAllInfoInProps(this.props)){
            this.setState({ mounted : true });
            return null;
        }
        this.setLinkedDetails(true, null, { mounted : true });
    }

    /**
     * Get data for nested properties - Award and Lab. Save to state or use state object in callback.
     *
     * @param {boolean} [fallbackToAjax] - Whether to revert to AJAX to fetch info if not in provided ExpSet object.
     * @param {function} [callback] - A function ran after execution, before any AJAX fetching, which takes ones parameter - an object representing resulting state change. Used in place of setState if have more state to apply.
     * @param {Object} [newState] - State object to use. Defaults to empty object.
     */
    setLinkedDetails(fallbackToAjax = false, callback = null, newState = {}){
        if (!this.state.details_lab) {
            if (
                this.props.context.lab && typeof this.props.context.lab === 'object' &&
                this.props.context.lab.address1 && this.props.context.lab.title
            ){
                newState.details_lab = this.props.context.lab;
            } else {
                var labDetails = this.getEmbeddedPropertyDetailsFromExperiments('lab', fallbackToAjax);
                if (labDetails !== null){
                    newState.details_lab = labDetails;
                }
            }
        }
        if (!this.state.details_award) {
            if (
                this.props.context.award && typeof this.props.context.award === 'object' &&
                this.props.context.award.project && this.props.context.award.title
            ){
                newState.details_award = this.props.context.award;
            } else {
                var awardDetails = this.getEmbeddedPropertyDetailsFromExperiments('award', fallbackToAjax);
                if (awardDetails !== null){
                    newState.details_award = awardDetails;
                }
            }
        }
        if (!this.state.details_submitted_by) {
            if (
                this.props.context.submitted_by && typeof this.props.context.submitted_by === 'object' &&
                this.props.context.submitted_by.title && this.props.context.submitted_by.first_name
            ){
                newState.details_submitted_by = this.props.context.submitted_by;
            } else {
                var submittedByDetails = this.getEmbeddedPropertyDetailsFromExperiments('submitted_by', fallbackToAjax);
                if (submittedByDetails !== null){
                    newState.details_submitted_by = submittedByDetails;
                }
            }
        }
        if (typeof callback == 'function') {
            callback(newState);
        } else if (Object.keys(newState).length > 0) {
            this.setState(newState);
        }
    }

    /**
     * Using similar approach(es) as browse.js to grab property details from experiments_in_set.
     * Grabs property detail object from sub-experiment(s) rather than embedding in own JSON output
     * to keep size of ExperimentSets down as can't remove (for example) experiments_in_set.lab
     * from encoded/types/experiment.py > ExperimentSet as it'd affect Browse page
     * experiment filtering & view.
     *
     * @param {string} propertyName - Name of property/key in schema for which to get details.
     * @param {boolean} allowAjaxFallback - Whether to start an AJAX request to fetch details if they are not in experiment(s).
     * @return {Object} Details for the property/key supplied, or null if not available or not matched.
     */
    getEmbeddedPropertyDetailsFromExperiments(propertyName, allowAjaxFallback = false){
        if (!this.props.context[propertyName]) return null;

        // If we have property already embedded as object, lets use it.

        //if (typeof this.props.context[propertyName] == 'object') return this.props.context[propertyName];


        // Else, grab from experiment(s) and make sure it is a match.
        var experiments = this.props.context.experiments_in_set,
            propertyID = null,
            propertyInfo = null;

        if (typeof this.props.context[propertyName] == 'string') {
            propertyID = this.props.context[propertyName];
        } else if (!Array.isArray(this.props.context[propertyName])){
            propertyID = object.atIdFromObject(this.props.context[propertyName]);
        }

        if (Array.isArray(experiments)){

            for (var i = 0; i < experiments.length; i++){

                // If we have property ID from ExperimentSet, just grab first property info with matching ID.
                if (
                    propertyID && experiments[i][propertyName] &&
                    propertyID == object.atIdFromObject(experiments[i][propertyName])
                ) {
                    propertyInfo = experiments[i][propertyName];
                    break;
                } else if (!propertyID){
                    // Fallback : set property from first experiment if no ID in expset.
                    // Then confirm all other experiments match first experiment's ID.
                    if (i == 0) {
                        propertyInfo = experiments[i][propertyName];
                        continue;
                    } else if ((object.atIdFromObject(experiments[i][propertyName]) || 'a') === (object.atIdFromObject(propertyInfo) || 'b')) {
                        continue; // Good.
                    } else {
                        //throw new Error(propertyName + " IDs in experiments of ExperimentSet " + this.props.context.accession + " do not all match.");
                        return null;
                    }
                }

            }

        }

        // Uh-oh! ExperimentSet award exists but doesn't match that of any experiments'.
        // Perhaps fallback to using AJAX.
        if (!propertyInfo && propertyID){
            //console.warn("ExperimentSetView > details_" + propertyName + " could not be gotten from available data.");
            if (typeof window != 'undefined' && allowAjaxFallback) {
                console.warn("ExperimentSetView > Reverting to AJAX for " + propertyName);
                FormattedInfoBlock.onMountMaybeFetch.call(this, propertyName, this.props.context[propertyName]);
                //FormattedInfoBlock.ajaxPropertyDetails.call(this, propertyID, propertyName);
            }
        }

        return propertyInfo;
    }

    getAttributionInfo(){
        var attrInfo = {
            'labInfo'   : this.props.labInfo    || (this.state && this.state.details_lab)           || this.props.context.lab,
            'awardInfo' : this.props.awardInfo  || (this.state && this.state.details_award)         || this.props.context.award,
            'userInfo'  : this.props.userInfo   || (this.state && this.state.details_submitted_by)  || this.props.context.submitted_by
        };
        if (!attrInfo.userInfo && typeof this.props.context.submitted_by === 'undefined'){
            delete attrInfo.userInfo;
        }
        if (!attrInfo.awardInfo && typeof this.props.context.award === 'undefined'){
            delete attrInfo.awardInfo;
        }
        if (!attrInfo.labInfo && typeof this.props.context.lab === 'undefined'){
            delete attrInfo.labInfo;
        }
        return attrInfo;
    }

    render(){
        var attrInfo = this.getAttributionInfo();
        return (
            <div className="row info-area">
                <div className="col-sm-12">
                    <div className="row">

                        { this.props.context.produced_in_pub || Array.isArray(this.props.context.publications_of_set) ? 
                            <div className="col-sm-12 col-md-12 col-sm-float-right">
                                <Publications context={this.props.context} />
                                <hr/>
                            </div>
                        : null }

                        
                        { typeof attrInfo.labInfo !== 'undefined' ?
                        <div className="col-sm-12 col-md-12 col-sm-float-right">
                            { FormattedInfoBlock.Lab(attrInfo.labInfo) }
                        </div>
                        : null}

                        { typeof attrInfo.awardInfo !== 'undefined' ?
                        <div className="col-sm-12 col-md-12 col-sm-float-right">
                            { FormattedInfoBlock.Award(attrInfo.awardInfo) }
                        </div>
                        : null }

                        { typeof attrInfo.userInfo !== 'undefined' ?
                        <div className="col-sm-12 col-md-12 col-sm-float-right">
                            { FormattedInfoBlock.User(attrInfo.userInfo) }
                        </div>
                        : null }

                    </div>

                </div>
            </div>
        );
    }

}
