'use strict';

import React from 'react';
import _ from 'underscore';
import { Button } from 'react-bootstrap';
import { console, object, Schemas, fileUtil, DateUtility } from './../util';
import { FormattedInfoBlock } from './components';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';



export default class ProtocolView extends DefaultItemView {

    getTabViewContents(){

        var initTabs = [];

        initTabs.push(ProtocolViewOverview.getTabObject(this.props));

        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
    }

}


class ProtocolViewOverview extends React.PureComponent {

    /**
     * Get overview tab object for tabpane.
     *
     * @param {{ context: Object, schemas: Object|null }} props - Object containing Protocol Item context/result and schemas.
     */
    static getTabObject(props){
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
                    <ProtocolViewOverview context={props.context} schemas={props.schemas} />
                </div>
            )
        };
    }

    render(){
        const { context, schemas } = this.props;
        const tips = object.tipsFromSchema(schemas || Schemas.get(), context);
        const result = context;

        return (
            <div className="row overview-blocks">

                <OverViewBodyItem {...{ result, tips }} property='protocol_type' fallbackTitle="Protocol Type" wrapInColumn />

                <OverViewBodyItem {...{ result, tips }} property='protocol_classification' fallbackTitle="Protocol Classification" wrapInColumn />

                <ItemFileAttachment context={result} tips={tips} wrapInColumn includeTitle />

            </div>
        );

    }

}


export class ItemFileAttachment extends React.PureComponent {

    static defaultProps = {
        'required' : false,
        'includeTitle' : false,
        'itemType' : 'Protocol',
        'property' : "attachment",
        'btnSize' : null
    };

    wrapInColumn(){
        var wrapInColumn = this.props.wrapInColumn;
        if (!wrapInColumn) return arguments;
        return (
            <div className={typeof wrapInColumn === 'string' ? wrapInColumn : "col-xs-12 col-md-4"}>
                { Array.from(arguments) }
            </div>
        );
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
            <div className="mb-1">
                <i className="icon icon-fw icon-hdd-o" data-tip={(tip && tip.description) || null} />&nbsp; { Schemas.Term.bytesToLargerUnit(attachment.size) }
            </div>
        );
    }

    md5sum(){
        var attachment = (this.props.context && this.props.context.attachment) || null;
        if (!attachment || !attachment.md5sum || typeof attachment.md5sum !== 'string') return null;
        return (
            <div>
                <object.TooltipInfoIconContainerAuto tips={this.attachmentTips()} fallbackTitle="MD5" property="md5sum" className="text-500" result={attachment} elementType="span" /> : { attachment.md5sum }
            </div>
        );
    }

    attachmentType(){
        var attachment = (this.props.context && this.props.context.attachment) || null;
        if (!attachment || !attachment.md5sum || typeof attachment.md5sum !== 'string') return null;
        return (
            <div>
                <object.TooltipInfoIconContainerAuto tips={this.attachmentTips()} fallbackTitle="File Type" property="type" className="text-500" result={attachment} elementType="span" /> : { attachment.type }
            </div>
        );
    }

    render(){
        var { context, tips, includeTitle, property, wrapInColumn, btnSize } = this.props;

        if ((this.props.hideIfNoValue) && (!context || !context.attachment)) return null;
        var attachment = (context && context.attachment) || null;

        var fieldInfo = {};
        if (tips && tips.attachment){
            fieldInfo = tips.attachment;
        }

        var title = !includeTitle ? null : (
            <object.TooltipInfoIconContainerAuto {..._.pick(this.props, 'tips', 'schemas')} fallbackTitle="Attachment"
                property={property} result={context} elementType="h5" />
        );

        var contents = null;
        if (attachment){
            contents = (
                <div className={"row" + (includeTitle ? ' mt-1' : '')}>
                    <div className="col-xs-12">
                        <fileUtil.ViewFileButton
                            size={btnSize}
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

        return wrapInColumn ? this.wrapInColumn(elems) : elems;
    }

}
