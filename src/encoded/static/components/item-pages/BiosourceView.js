'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Collapse } from 'react-bootstrap';
import { console, object, Schemas } from './../util';
import { ExperimentSetTableTabView } from './components/tables/ExperimentSetTables';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';



export default class BiosourceView extends DefaultItemView {

    getTabViewContents(){
        const { context, schemas, browseBaseState } = this.props;
        const initTabs = [];

        initTabs.push(BiosourceViewOverview.getTabObject(context, schemas));

        initTabs.push(ExperimentSetTableTabView.getTabObject(_.extend({}, this.props, {
            'requestHref' : (
                "/search/?type=ExperimentSetReplicate&experimentset_type=replicate&" +
                (browseBaseState === "only_4dn" ? "award.project=4DN&" : "") +
                "experiments_in_set.biosample.biosource.display_title=" + context.display_title
            ),
            'title' : function(props, { totalCount }){
                return (totalCount ? totalCount + ' ' : '') + "Experiment Sets";
            }
        })));

        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}


class BiosourceViewOverview extends React.PureComponent {

    /**
     * Get overview tab object for tabpane.
     *
     * @param {Object} context - Current Protocol Item being shown.
     * @param {Object} schemas - Schemas passed down from app.state.schemas (or Schemas.get()).
     */
    static getTabObject(context, schemas){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'biosource-info',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Overview</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <BiosourceViewOverview context={context} schemas={schemas} />
                </div>
            )
        };
    }

    render(){
        const { context, schemas } = this.props;
        return (
            <div>
                <OverViewBody result={context} schemas={schemas} />
            </div>
        );

    }

}


class OverViewBody extends React.PureComponent {

    cellLineDetails(commonProps){
        const { result } = this.props;
        if (!result.cell_line) return null;
        return (
            <div>
                <h3 className="tab-section-title">
                    <span>Cell Line</span>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <div className="row overview-blocks">
                    <OverViewBodyItem {...commonProps} wrapInColumn="col-xs-6 col-md-3" property="cell_line" fallbackTitle="Cell Line" />

                    <OverViewBodyItem {...commonProps} wrapInColumn="col-xs-6 col-md-3" property="cell_line_tier" fallbackTitle="Cell Line Tier" />

                    <OverViewBodyItem {...commonProps} wrapInColumn="col-xs-6 col-md-6" property="SOP_cell_line" fallbackTitle="SOP for Cell Line" listItemElement="div" listWrapperElement="div" singleItemClassName="block" titleRenderFxn={OverViewBodyItem.titleRenderPresets.embedded_item_with_attachment} />

                </div>
            </div>
        );
    }

    render(){
        const { result, schemas } = this.props;
        const tips = object.tipsFromSchema(schemas || Schemas.get(), result);
        const commonProps = {
            result, tips, wrapInColumn : true, //listItemElement : 'div', listWrapperElement : 'div', singleItemClassName: "block"
        };

        return (
            <div className="row">
                <div className="col-md-12 col-xs-12">
                    <div className="row overview-blocks mb-2">

                        <OverViewBodyItem {...commonProps} wrapInColumn="col-xs-6 col-md-6" listItemElement="div" listWrapperElement="div" singleItemClassName="block" property="individual" overrideTitle="Organism - Individual" fallbackTitle="Individual" titleRenderFxn={function(field, val){
                            return <IndividualItemTitle context={val} defaultOpen />;
                        }} />

                        <OverViewBodyItem {...commonProps} wrapInColumn="col-xs-6 col-md-3" property="biosource_type" fallbackTitle="Biosource Type" listItemElement="div" listWrapperElement="div" singleItemClassName="block" />

                        <OverViewBodyItem {...commonProps} wrapInColumn="col-xs-6 col-md-3" property="tissue" fallbackTitle="Tissue Name" hideIfNoValue />

                    </div>

                    { this.cellLineDetails(commonProps) }
                    { (Array.isArray(result.modifications) && result.modifications.length > 0) || result.url || result.biosource_vendor ?
                        <h4 className="tab-section-title">
                            <span>Other</span>
                        </h4>
                        : null
                    }
                    <hr className="tab-section-title-horiz-divider"/>
                    <div className="row overview-blocks">
                        <OverViewBodyItem {...commonProps} property="modifications" fallbackTitle="Modifications" hideIfNoValue />
                        <OverViewBodyItem {...commonProps} property="url" fallbackTitle="URL" titleRenderFxn={OverViewBodyItem.titleRenderPresets.url_string} hideIfNoValue />
                        <OverViewBodyItem {...commonProps} property="biosource_vendor" fallbackTitle="Biosource Vendor" hideIfNoValue />
                    </div>

                </div>
            </div>
        );
    }
}


export class IndividualItemTitle extends React.Component {

    constructor(props){
        super(props);
        this.toggle = this.toggle.bind(this);
        this.state = { 'open' : typeof props.defaultOpen === 'boolean' ? props.defaultOpen : false };
    }

    toggle(){
        this.setState(({ open })=>{
            return { 'open' : !open };
        });
    }

    age(){
        var indv = this.props.result || this.props.context;
        if (!indv.age || !indv.age_units) {
            return null;
        }
        var life_stage = indv.life_stage || indv.mouse_life_stage || null;
        return (
            <div className="row">
                <div className="col-sm-6 text-right">
                    <object.TooltipInfoIconContainerAuto property="age" result={indv} fallbackTitle="Age" itemType="IndividualHuman" schemas={this.props.schemas || Schemas.get()} />
                </div>
                <div className="col-sm-6 text-left">
                    {indv.age } { indv.age_units + (indv.age > 1 ? "s" : "") } { life_stage && "(" + life_stage + ")" }
                </div>
            </div>
        );
    }

    ethnicity(){
        var indv = this.props.result || this.props.context;
        if (!indv.ethnicity) {
            return null;
        }
        return (
            <div className="row">
                <div className="col-sm-6 text-right">
                    <object.TooltipInfoIconContainerAuto property="ethnicity" fallbackTitle="Ethnicity" result={indv} itemType="IndividualHuman" schemas={this.props.schemas || Schemas.get()} />
                </div>
                <div className="col-sm-6 text-left">
                    { indv.ethnicity }
                </div>
            </div>
        );
    }

    healthStatus(){
        var indv = this.props.result || this.props.context;
        if (!indv.health_status) {
            return null;
        }
        return (
            <div className="row">
                <div className="col-sm-6 text-right">
                    <object.TooltipInfoIconContainerAuto property="health_status" fallbackTitle="Health Status" result={indv} itemType="IndividualHuman" schemas={this.props.schemas || Schemas.get()} />
                </div>
                <div className="col-sm-6 text-left">
                    { indv.health_status }
                </div>
            </div>
        );
    }

    mouseStrain(){
        var indv = this.props.result || this.props.context;
        if (!indv.mouse_strain) {
            return null;
        }
        return (
            <div className="row">
                <div className="col-sm-6 text-right">
                    <object.TooltipInfoIconContainerAuto property="mouse_strain" fallbackTitle="Mouse Strain" result={indv} itemType="IndividualMouse" schemas={this.props.schemas || Schemas.get()} />
                </div>
                <div className="col-sm-6 text-left">
                    { indv.mouse_strain }
                </div>
            </div>
        );
    }

    toggleIcon(){
        if (!this.moreInfoExists()) return null;
        return <i className={"icon clickable icon-caret-right" + (this.state.open ? " icon-rotate-90" : "")} onClick={this.toggle} />;
    }

    moreInfoExists(){
        var indv = this.props.result || this.props.context;
        if (indv.age && indv.age_units) return true;
        if (indv.ethnicity) return true;
        if (indv.mouse_strain) return true;
        if (indv.health_status) return true;
        return false;
    }

    moreInfoPanel(){
        return (
            <div className="more-info-panel">
                <div className="inner mt-07" style={{ borderTop: "1px solid #ddd", paddingTop : 7 }}>
                    { this.age() }
                    { this.healthStatus() }
                    { this.ethnicity() }
                    { this.mouseStrain() }
                </div>
            </div>
        );
    }

    render(){
        var indv = this.props.result || this.props.context;
        if (!indv || !object.atIdFromObject(indv)) return <span>None</span>;
        var href = object.atIdFromObject(indv);
        var sex = null;
        if (indv.sex && typeof indv.sex === "string"){
            if (indv.sex.toLowerCase() === "female"){
                sex = <i className="icon icon-fw icon-venus" data-tip="Sex: Female" />;
            } else if (indv.sex.toLowerCase() === "male"){
                sex = <i className="icon icon-fw icon-mars" data-tip="Sex: Male" />;
            }
        }
        var title = indv.display_title;
        var organism = null;
        if (indv.organism && indv.organism.name && typeof indv.organism.name === "string" && title.indexOf(indv.organism.name) === -1){
            organism = Schemas.Term.capitalizeSentence(indv.organism.name);
        }

        return (
            <div className="individual-organism">
                { sex } { organism ? <span className={(object.isAccessionRegex(organism) ? "mono-text" : null)}> { organism } - </span> : null }
                <a href={href} className={object.isAccessionRegex(title) ? "mono-text" : null}>{ title || null }</a> { this.toggleIcon() }
                { this.moreInfoExists() ? <Collapse in={this.state.open}>{ this.moreInfoPanel() }</Collapse> : null }
            </div>
        );
    }
}
