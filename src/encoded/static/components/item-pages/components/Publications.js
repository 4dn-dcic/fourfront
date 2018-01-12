'use strict';

import React from 'react';
import _ from 'underscore';
import url from 'url';
import { Button } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import { console, DateUtility, object } from './../../util';
import { FlexibleDescriptionBox } from './FlexibleDescriptionBox';
import { PartialList } from './PartialList';
import { FormattedInfoWrapper, WrappedListBlock, WrappedCollapsibleList } from './FormattedInfoBlock';

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
 * @memberof module:item-pages/components.Publications
 * @class DetailBlock
 * @extends {React.Component}
 * 
 * @prop {string} singularTitle         - Title to show in top left of block. 'S' gets added to end of title if more than 1 item.
 * @prop {Object} publication           - Publication whose link and display_title to display.
 * @prop {Element|Element[]} children   - React Element(s) to display in detail area under title.
 */
class DetailBlock extends React.Component {

    defaultProps = {
        'singularTitle' : 'Publication'
    }

    render(){
        var publication = this.props.publication;
        if (typeof publication !== 'object' || !publication) return null;
        return (
            <FormattedInfoWrapper singularTitle={this.props.singularTitle} isSingleItem={true}>
                <h5 className="block-title">
                    <a href={object.atIdFromObject(publication)}>{ publication.display_title }</a>
                </h5>
                <div className="details">{ this.props.children }</div>
            </FormattedInfoWrapper>
        );
    }

}


class ShortAttribution extends React.Component {

    render(){
        var pub = this.props.publication;

        var authorsString = null;
        if (Array.isArray(pub.authors)){
            if (pub.authors.length === 1){
                authorsString = pub.authors[0];
            } else {
                authorsString = pub.authors[0];
                if (pub.authors[1]) authorsString += ', ' + pub.authors[1];
                if (pub.authors[2]) authorsString += ', et al.';
            }
        }

        var journalString = null;
        if (typeof pub.journal === 'string'){
            journalString = pub.journal;
        }

        if (journalString){
            authorsString += ', ';
        }

        var yearPublished = null;
        try {
            if (typeof pub.date_published === 'string'){
                yearPublished = (new Date(pub.date_published)).getFullYear();
            }
            if (journalString && yearPublished){
                yearPublished = ' ' + yearPublished;
            }
        } catch (e){
            yearPublished = null;
        }

        return (
            <span>
                { authorsString }
                { journalString? <em>{ journalString }</em> : null }
                { yearPublished }
            </span>
        );
    }

}


class ProducedInPublicationBelowHeaderRow extends React.Component {
    render(){
        if (!this.props.produced_in_pub) return null;
        return (
            <div className="row mb-2">
                <div className="col-sm-12">
                    <DetailBlock publication={this.props.produced_in_pub} singularTitle="Source Publication" >
                        <div className="more-details">
                            <ShortAttribution publication={this.props.produced_in_pub} />
                        </div>
                    </DetailBlock>
                </div>
            </div>
        );
    }
}

/**
 * Shows publications for current Item.
 * Currently, only ExperimentSet seems to have publications so this is present only on Component module:item-pages/ExperimentSetView .
 * 
 * @class Publications
 * 
 * @prop {Object[]|null} publications - JSON representation of publications. Should be available through context.publications_of_set for at least ExperimentSet objects.
 */
export class Publications extends React.Component {

    static DetailBlock = DetailBlock;
    static ShortAttribution = ShortAttribution;
    static ProducedInPublicationBelowHeaderRow = ProducedInPublicationBelowHeaderRow

    constructor(props){
        super(props);
        this.shortAbstract = this.shortAbstract.bind(this);
        this.toggleAbstractIcon = this.toggleAbstractIcon.bind(this);
        this.detailRows = this.detailRows.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            'abstractCollapsed' : true
        };
    }

    /**
     * @memberof Publications
     */
    componentDidMount(){
        ReactTooltip.rebuild();
    }

    /**
     * @memberof module:item-pages/components.Publications
     */
    shortAbstract(){
        var abstract = this.props.context.produced_in_pub.abstract;
        if (!abstract || typeof abstract !== 'string') return null;
        if (!this.state.abstractCollapsed) return abstract;
        if (abstract.length > 240){
            return abstract.slice(0, 238) + '...';
        } else {
            return abstract;
        }
    }

    toggleAbstractIcon(publication = this.props.context.produced_in_pub){
        if (!publication || !publication.abstract) return null;
        if (publication && publication.abstract && publication.abstract.length <= 240){
            return null;
        }
        return (
            <i
                className={"icon abstract-toggle icon-fw icon-" + (this.state.abstractCollapsed ? 'plus' : 'minus')}
                data-tip={this.state.abstractCollapsed ? 'See More' : 'Collapse'}
                onClick={(e)=>{
                    this.setState({ abstractCollapsed : !this.state.abstractCollapsed });
                }}
            />
        );
    }

    detailRows(publication = this.props.context.produced_in_pub){
        if (!publication || typeof publication === 'undefined'){
            return [];
        }

        var details = [];

        if (publication && typeof publication.date_published === 'string'){
            details.push({
                'label' : 'Published',
                'content' : DateUtility.format(publication.date_published)
            });
        }

        if (typeof publication.authors === 'string'){
            details.push({
                'label' : 'Authors',
                'content' : publication.authors
            });
        } else if (Array.isArray(publication.authors) && publication.authors.length > 0){
            details.push({
                'label' : 'Author' + (publication.authors.length > 1 ? 's' : ''),
                'content' : publication.authors.join(', ')
            });
        }

        if (typeof publication.abstract === 'string'){
            //var inclProps = {};
            //var shortAbstract = this.shortAbstract();
            //if (shortAbstract !== publication.abstract){
            //    inclProps['data-tip'] = '...' + publication.abstract.slice(238);
            //    inclProps['data-place'] = 'bottom';
            //}
            details.push({
                label : <span>{ this.toggleAbstractIcon() } Abstract</span>,
                content : this.shortAbstract()
            });
        }

        return details;
    }

    render(){
        var context = this.props.context;
        var usedInPublications = [];
        if (Array.isArray(context.publications_of_set) && context.publications_of_set.length > 0){
            usedInPublications = context.publications_of_set.filter(function(pub){
                if (pub.link_id && context.produced_in_pub && context.produced_in_pub.link_id && pub.link_id === context.produced_in_pub.link_id){
                    return false;
                }
                return true;
            });
        }

        return (
            <div className="publications-section">
                <Publications.DetailBlock publication={context.produced_in_pub} singularTitle="Publication Details">
                    {
                        this.detailRows().map(function(d, i){
                            return (
                                <div className="row details-row" key={ d.key || d.label || i }>
                                    <div className="col-xs-2 text-600 text-right label-col">{ d.label }</div>
                                    <div className="col-xs-10">{ d.content }</div>
                                </div>
                            );
                        })
                    }
                </Publications.DetailBlock>
                <WrappedCollapsibleList items={usedInPublications} singularTitle="Used in Publication" itemClassName="publication" />
            </div>
        );
    }

}

