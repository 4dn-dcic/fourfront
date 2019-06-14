'use strict';

import React from 'react';
import _ from 'underscore';
import { console, object } from './../../util';
import { FormattedInfoWrapper } from './FormattedInfoBlock';


export class SOPBelowHeaderRow extends React.PureComponent {

    static defaultProps = {
        'outerClassName' : "mb-2"
    };

    /**
     * @todo
     * Maybe get rid of `<div className={outerClassName}>` completely and allow parent/containing
     * component to create own <div> with whatever className is desired, among other element attributes.
     */
    render(){
        var { sop, outerClassName } = this.props;
        if (!sop) return null;
        return (
            <div className={outerClassName}>
                <FormattedInfoWrapper singularTitle="Approved SOP" isSingleItem noDetails={!sop.description} iconClass="file">
                    <h5 className={"block-title" + ( sop.description ? '' : ' mt-08' )}>{ object.itemUtil.generateLink(sop) }</h5>
                    { sop.description && <div className="more-details">{ sop.description }</div> }
                </FormattedInfoWrapper>
            </div>
        );
    }
}


export class LinkBelowHeaderRow extends React.PureComponent {

    static defaultProps = {
        'outerClassName' : "mb-2"
    };

    /**
     * @todo
     * Maybe get rid of `<div className={outerClassName}>` completely and allow parent/containing
     * component to create own <div> with whatever className is desired, among other element attributes.
     */
    render(){
        var { url, outerClassName } = this.props;
        if (!url) return null;
        return (
            <div className={outerClassName}>
                <FormattedInfoWrapper singularTitle="Reference Protocol" isSingleItem iconClass="file">
                    <h5 className={"block-title" + ( ' mt-08' )}>
                        <a href={url.link} target="_blank" rel="noopener noreferrer">{ url.title }</a>
                    </h5>
                </FormattedInfoWrapper>
            </div>
        );
    }
}
