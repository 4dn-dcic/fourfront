'use strict';

import React from 'react';
import _ from 'underscore';
import url from 'url';
import { console, object } from './../../util';
import { FormattedInfoWrapper, WrappedListBlock } from './FormattedInfoBlock';

/*
var testData = [ // Use this to test list view(s) as none defined in test data.
    { 'link_id' : '~something~here~1', 'display_title' : "Sample Publicstion One which involces this experiment set and other things" },
    { 'link_id' : '~something~here~2', 'display_title' : "Something else wich references this set and has data and many words" },
    { 'link_id' : '~something~here~3', 'display_title' : "Hello 1123" },
    { 'link_id' : '~something~here~4', 'display_title' : "Hello 11234 sdfsfd asfsdf asfgsdg sdfsdg sadfsdg sdgdsg" },
    { 'link_id' : '~something~here~5', 'display_title' : "Hello 112345" },
    { 'link_id' : '~something~here~6', 'display_title' : "Hello 1123456 123456" }
];
*/



/**
 * Display a FormattedInfoBlock-style block with custom detail (defined via props.children).
 *
 * @memberof module:item-pages/components.Protocols
 * @class DetailBlock
 * @extends {React.Component}
 *
 * @prop {string} singularTitle         - Title to show in top left of block. 'S' gets added to end of title if more than 1 item.
 * @prop {Object} protocol           - Protocol whose link and display_title to display.
 * @prop {Element|Element[]} children   - React Element(s) to display in detail area under title.
 */
class DetailBlock extends React.PureComponent {

    static defaultProps = {
        'singularTitle' : 'Protocol'
    };

    render(){
        var { protocol, singularTitle, children } = this.props;
        if (typeof protocol !== 'object' || !protocol) return null;

        var title =  protocol.display_title;

        return (
            <FormattedInfoWrapper singularTitle={singularTitle} isSingleItem>
                <h5 className="block-title">
                    <a href={object.atIdFromObject(protocol)}>{ title }</a>
                </h5>
                <div className="details" children={children} />
            </FormattedInfoWrapper>
        );
    }

}


class SopBelowHeaderRow extends React.Component {
    render(){
        if (!this.props.sop) return null;
        return (
            <div className="row mb-2">
                <div className="col-sm-12">
                    <DetailBlock protocol={this.props.sop} singularTitle="Approved SOP" />
                </div>
            </div>
        );
    }
}


/**
 * Shows protocols for current Item.
 *
 * @class Protocols
 *
 * @prop {Object[]|null} protocols - JSON representation of protocols. Should be available through context.sop for ExperimentType objects.
 */
export class Protocols extends React.PureComponent {

    static DetailBlock = DetailBlock;
    static SopBelowHeaderRow = SopBelowHeaderRow

}
