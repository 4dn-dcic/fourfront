'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as globals from './../globals';
import { Button } from 'react-bootstrap';
import { console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide, DateUtility } from './../util';
import { FormattedInfoBlock } from './components';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';



export default class ProtocolView extends DefaultItemView {

    getTabViewContents(){

        var initTabs = [];
        var context = this.props.context;

        initTabs.push(ProtocolViewOverview.getTabObject(context, this.props.schemas));

        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution, Audits)
    }

}

globals.content_views.register(ProtocolView, 'Protocol');


class ProtocolViewOverview extends React.Component {
    
    /**
     * Get overview tab object for tabpane.
     * 
     * @param {Object} context - Current Protocol Item being shown.
     * @param {Object} schemas - Schemas passed down from app.state.schemas (or Schemas.get()).
     */
    static getTabObject(context, schemas){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'protocol-info',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Overview</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <ProtocolViewOverview context={context} schemas={schemas} />
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

                        <OverViewBodyItem {...{ result, tips }} property='protocol_type' fallbackTitle="Protocol Type" wrapInColumn />

                        <OverViewBodyItem {...{ result, tips }} property='protocol_classification' fallbackTitle="Protocol Classification" wrapInColumn />

                        <ItemFileAttachment context={result} tips={tips} wrapInColumn includeTitle />

                    </div>
                </div>
            </div>
        );
    }
}

export class ItemFileAttachment extends React.Component {

    static defaultProps = {
        'required' : false,
        'includeTitle' : false,
        'itemType' : 'Protocol'
    }

    wrapInColumn(){
        var wrapInColumn = this.props.wrapInColumn;
        if (!wrapInColumn) return arguments;
        return <div className={typeof wrapInColumn === 'string' ? wrapInColumn : "col-xs-12 col-md-4"} children={Array.from(arguments)}/>;
    }

    attachmentTips(){
        var tips = this.props.tips;
        var fieldInfo = {};
        if (tips && tips.attachment && tips.attachment.properties){
            fieldInfo = tips.attachment.properties;
        }
        return fieldInfo;
    }

    size(){
        var attachment = (this.props.context && this.props.context.attachment) || null;
        if (!attachment || !attachment.size || typeof attachment.size !== 'number') return null;
        var tip = this.attachmentTips().size;
        return (
            <div className="mb-1"><i className="icon icon-fw icon-hdd-o" data-tip={(tip && tip.description) || null} />&nbsp; { Schemas.Term.bytesToLargerUnit(attachment.size) }</div>
        );
    }

    md5sum(){
        var attachment = (this.props.context && this.props.context.attachment) || null;
        if (!attachment.md5sum || typeof attachment.md5sum !== 'string') return null;
        return (
            <div>
                <object.TooltipInfoIconContainerAuto tips={this.attachmentTips()} fallbackTitle="MD5" property="md5sum" className="text-500" result={attachment} elementType="span" /> : { attachment.md5sum }
            </div>
        );
    }

    attachmentType(){
        var attachment = (this.props.context && this.props.context.attachment) || null;
        if (!attachment.md5sum || typeof attachment.md5sum !== 'string') return null;
        return (
            <div>
                <object.TooltipInfoIconContainerAuto tips={this.attachmentTips()} fallbackTitle="File Type" property="type" className="text-500" result={attachment} elementType="span" /> : { attachment.type }
            </div>
        );
    }

    render(){
        var { schemas, context, tips, includeTitle } = this.props;

        if ((this.props.hideIfNoValue) && (!context || !context.attachment)) return null;
        var attachment = (context && context.attachment) || null;

        var fieldInfo = {};
        if (tips && tips.attachment){
            fieldInfo = tips.attachment;
        }

        var title = !includeTitle ? null : (
            <object.TooltipInfoIconContainerAuto {..._.pick(this.props, 'tips', 'schemas')} fallbackTitle="Attachment" property={this.props.property || "attachment"} result={context} elementType="h5" />
        );

        var contents = null;
        if (attachment){
            contents = (
                <div className={"row" + (includeTitle ? ' mt-1' : '')}>
                    <div className="col-xs-12">
                        <fileUtil.ViewFileButton
                            filename={(attachment && attachment.download) || null}
                            href={object.itemUtil.atId(context) + attachment.href}
                            disabled={typeof attachment.href !== 'string' || attachment.href.length === 0}
                            className={fileUtil.ViewFileButton.defaultProps.className + ' btn-block'}
                        />
                    </div>
                    <div className="col-xs-12">{ this.size() }{ this.md5sum() }{ this.attachmentType() }</div>
                </div>
            );
        } else {
            contents = <div className="overview-single-element no-value">None</div>;
        }

        var elems = (
            <div className="item-file-attachment inner">
                { title } { contents }
            </div>
        );

        return this.props.wrapInColumn ? this.wrapInColumn(elems) : elems; 
    }

}
