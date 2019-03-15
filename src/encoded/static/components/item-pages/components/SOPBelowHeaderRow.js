'use strict';

import React from 'react';
import _ from 'underscore';
import { console, object } from './../../util';
import { FormattedInfoWrapper } from './FormattedInfoBlock';


export class SOPBelowHeaderRow extends React.PureComponent {
    render(){
        var sop = this.props.sop;
        if (!sop) return null;
        return (
            <div className="mb-2">
                <FormattedInfoWrapper singularTitle="Approved SOP" isSingleItem noDetails={!sop.description}>
                    <h5 className={"block-title" + ( sop.description ? '' : ' mt-08' )}>{ object.itemUtil.generateLink(sop) }</h5>
                    { sop.description && <div className="more-details">{ sop.description }</div> }
                </FormattedInfoWrapper>
            </div>
        );
    }
}

