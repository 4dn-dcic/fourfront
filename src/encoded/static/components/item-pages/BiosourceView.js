'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as globals from './../globals';
import { Button } from 'react-bootstrap';
import { console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide, DateUtility } from './../util';
import { FormattedInfoBlock } from './components';
import { ItemBaseView, OverViewBodyItem } from './DefaultItemView';



export default class BiosourceView extends ItemBaseView {

    getTabViewContents(){

        var initTabs = [];
        var context = this.props.context;

        initTabs.push(BiosourceViewOverview.getTabObject(context, this.props.schemas));

        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution, Audits)
    }

}

globals.content_views.register(BiosourceView, 'Biosource');


class BiosourceViewOverview extends React.Component {
    
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
        var { context } = this.props;

        return (
            <div>
                <OverViewBody result={this.props.context} schemas={this.props.schemas} />
            </div>
        );

    }

}


class OverViewBody extends React.Component {

    render(){
        var result = this.props.result;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), result);

        return (
            <div className="row">
                <div className="col-md-12 col-xs-12">
                    <div className="row overview-blocks">

                        <OverViewBodyItem {...{ result, tips }} property='biosource_type' fallbackTitle="Biosource Type" wrapInColumn />

                        <OverViewBodyItem {...{ result, tips }} property='individual' fallbackTitle="Individual" wrapInColumn titleRenderFxn={function(field, val){
                            return <IndividualItemTitle context={val} />;
                        }} />

                        <OverViewBodyItem {...{ result, tips }} property='biosource_vendor' fallbackTitle="Biosource Vendor" wrapInColumn />



                        <OverViewBodyItem {...{ result, tips }} property='cell_line' fallbackTitle="Cell Line" wrapInColumn />

                        <OverViewBodyItem {...{ result, tips }} property='cell_line_tier' fallbackTitle="Cell Line Tier" wrapInColumn />

                        <OverViewBodyItem {...{ result, tips }} property='SOP_cell_line' fallbackTitle="SOP for Cell Line" wrapInColumn listItemElement='div' listWrapperElement='div' singleItemClassName="block" titleRenderFxn={OverViewBodyItem.titleRenderPresets.embedded_item_with_attachment} />


                        <OverViewBodyItem {...{ result, tips }} property='modifications' fallbackTitle="Modifications" wrapInColumn hideIfNoValue />

                    </div>
                </div>
            </div>
        );
    }
}


export class IndividualItemTitle extends React.Component {
    render(){
        var indv = this.props.result || this.props.context;
        if (!indv || !object.atIdFromObject(indv)) return <span>None</span>;
        var href = object.atIdFromObject(indv);
        var sex = null;
        if (indv.sex && typeof indv.sex === 'string'){
            if (indv.sex.toLowerCase() === 'female'){
                sex = <i className="icon icon-fw icon-venus"/>;
            } else if (indv.sex.toLowerCase() === 'male'){
                sex = <i className="icon icon-fw icon-mars"/>;
            }
        }
        var title = indv.display_title;
        var organism = null;
        if (indv.organism && indv.organism.name && typeof indv.organism.name === 'string' && title.indexOf(indv.organism.name) === -1){
            organism = Schemas.Term.capitalizeSentence(indv.organism.name);
        }
        return (
            <span>{ sex } { organism ? <span className={(object.isAccessionRegex(organism) ? 'mono-text' : null)}> { organism } - </span> : null }
                <a href={href} className={object.isAccessionRegex(title) ? 'mono-text' : null}>{ title || null }</a>
            </span>
        );
    }
}

