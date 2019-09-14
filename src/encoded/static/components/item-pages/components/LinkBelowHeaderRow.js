'use strict';

import React from 'react';
import { console, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { FormattedInfoWrapper } from './FormattedInfoBlock';


export const SOPBelowHeaderRow = React.memo(function SOPBelowHeaderRow({ sop }){
    if (!sop) return null;
    const { description } = sop;
    return (
        <FormattedInfoWrapper singularTitle="Approved SOP" isSingleItem noDetails={!description} iconClass="file fas">
            <h5 className={"block-title" + ( description ? '' : ' mt-1' )}>
                { object.itemUtil.generateLink(sop) }
            </h5>
            { description && <div className="more-details">{ description }</div> }
        </FormattedInfoWrapper>
    );
});


export const LinkBelowHeaderRow = React.memo(function LinkBelowHeaderRow({ url, title, singularTitle, iconClass }){
    if (!url) return null;
    return (
        <FormattedInfoWrapper isSingleItem {...{ singularTitle, iconClass }}>
            <h5 className="block-title mt-1">
                <a href={url} target="_blank" rel="noopener noreferrer">{ title || url }</a>
            </h5>
        </FormattedInfoWrapper>
    );
});
LinkBelowHeaderRow.defaultProps = {
    "singularTitle" : "Reference Protocol",
    "iconClass" : "file fas"
};
