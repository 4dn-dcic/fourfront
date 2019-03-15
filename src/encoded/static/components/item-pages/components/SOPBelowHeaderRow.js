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
                <FormattedInfoWrapper singularTitle="Approved SOP" isSingleItem>
                    <h5 className="block-title">{ object.itemUtil.generateLink(sop) }</h5>
                    <div className="details text-ellipsis-container">{ sop.description }</div>
                </FormattedInfoWrapper>
            </div>
        );
    }
}

