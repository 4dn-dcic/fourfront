'use strict';

import React from 'react';
import _ from 'underscore';
import { console, object, Schemas, fileUtil } from './../../util';


export class ItemFileAttachment extends React.PureComponent {

    static defaultProps = {
        'required' : false,
        'includeTitle' : false,
        'itemType' : 'Protocol',
        'property' : "attachment",
        'btnSize' : null
    };

    wrapInColumn(){
        const { wrapInColumn } = this.props;
        if (!wrapInColumn) return arguments;
        return (
            <div className={typeof wrapInColumn === 'string' ? wrapInColumn : "col-xs-12 col-md-4"}>
                { Array.from(arguments) }
            </div>
        );
    }

    attachmentTips(){
        const { tips } = this.props;
        let fieldInfo = {};
        if (tips && tips.attachment && tips.attachment.properties){
            fieldInfo = tips.attachment.properties;
        }
        return fieldInfo;
    }

    size(){
        const { context : { attachment = null } } = this.props;
        if (!attachment || !attachment.size || typeof attachment.size !== 'number') return null;
        const tip = this.attachmentTips().size;
        return (
            <div className="mb-1">
                <i className="icon icon-fw icon-hdd-o" data-tip={(tip && tip.description) || null} />&nbsp; { Schemas.Term.bytesToLargerUnit(attachment.size) }
            </div>
        );
    }

    md5sum(){
        const { context : { attachment = null } } = this.props;
        if (!attachment || !attachment.md5sum || typeof attachment.md5sum !== 'string') return null;
        return (
            <div>
                <object.TooltipInfoIconContainerAuto tips={this.attachmentTips()} fallbackTitle="MD5" property="md5sum" className="text-500" result={attachment} elementType="span" /> : { attachment.md5sum }
            </div>
        );
    }

    attachmentType(){
        const { context : { attachment = null } } = this.props;
        if (!attachment || !attachment.md5sum || typeof attachment.md5sum !== 'string') return null;
        return (
            <div>
                <object.TooltipInfoIconContainerAuto tips={this.attachmentTips()} fallbackTitle="File Type" property="type" className="text-500" result={attachment} elementType="span" /> : { attachment.type }
            </div>
        );
    }

    render(){
        const { context, tips, includeTitle, property, wrapInColumn, btnSize, hideIfNoValue } = this.props;
        const { attachment = null } = context;

        if (hideIfNoValue && (!context || !attachment)) return null;

        const title = !includeTitle ? null : (
            <object.TooltipInfoIconContainerAuto {..._.pick(this.props, 'tips', 'schemas')} fallbackTitle="Attachment"
                property={property} result={context} elementType="h5" />
        );

        let contents = null;
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

        const elems = (
            <div className="item-file-attachment inner">
                { title } { contents }
            </div>
        );

        return wrapInColumn ? this.wrapInColumn(elems) : elems;
    }

}
