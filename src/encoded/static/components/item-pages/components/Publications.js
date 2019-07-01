'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { console, object } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { formatPublicationDate } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/LocalizedTime';
import { FormattedInfoWrapper, WrappedCollapsibleList } from './FormattedInfoBlock';



/**
 * Display a FormattedInfoBlock-style block with custom detail (defined via props.children).
 *
 * @prop {string} singularTitle         - Title to show in top left of block. 'S' gets added to end of title if more than 1 item.
 * @prop {Object} publication           - Publication whose link and display_title to display.
 * @prop {Element|Element[]} children   - React Element(s) to display in detail area under title.
 */
class DetailBlock extends React.PureComponent {

    static defaultProps = {
        'singularTitle' : 'Publication'
    };

    render(){
        var { publication, singularTitle, children } = this.props;
        if (!publication || !object.itemUtil.atId(publication)) return null;

        var title = publication.display_title,
            url = object.itemUtil.atId(publication);

        if (publication.short_attribution && title.indexOf(publication.short_attribution + ' ') > -1){
            // Short Attribution is added to display_title on back-end; clear it off here since we craft our own attribution string manually.
            title = title.replace(publication.short_attribution + ' ', '');
        }

        return (
            <FormattedInfoWrapper singularTitle={singularTitle} isSingleItem>
                <h5 className="block-title">
                    <a href={url}>{ title }</a>
                </h5>
                <div className="details">{ children }</div>
            </FormattedInfoWrapper>
        );
    }

}


class ShortAttribution extends React.PureComponent {

    static propTypes = {
        'publication'   : PropTypes.shape({
            'authors'       : PropTypes.arrayOf(PropTypes.string),
            'journal'       : PropTypes.string,
            'date_published': PropTypes.string
        }).isRequired
    };

    render(){
        var pub = this.props.publication;
        if (!pub || !object.itemUtil.atId(pub)) return null;

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
            if (pub.date_published && typeof pub.date_published === 'string'){
                yearPublished = formatPublicationDate(pub.date_published, false);
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


class PublicationBelowHeaderRow extends React.Component {

    static defaultProps = {
        'singularTitle' : "Source Publication",
        'outerClassName' : "mb-2"
    };

    /**
     * @todo
     * Maybe get rid of `<div className={outerClassName}>` completely and allow parent/containing
     * component to create own <div> with whatever className is desired, among other element attributes.
     */
    render(){
        var { publication, singularTitle, outerClassName } = this.props;
        if (!publication || !object.itemUtil.atId(publication)) return null;
        return (
            <div className={outerClassName}>
                <DetailBlock publication={publication} singularTitle={singularTitle} >
                    <div className="more-details">
                        <ShortAttribution publication={publication} />
                    </div>
                </DetailBlock>
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
export class Publications extends React.PureComponent {

    static DetailBlock = DetailBlock;
    static ShortAttribution = ShortAttribution;
    static PublicationBelowHeaderRow = PublicationBelowHeaderRow;

    constructor(props){
        super(props);
        this.shortAbstract = this.shortAbstract.bind(this);
        this.toggleAbstractIcon = this.toggleAbstractIcon.bind(this);
        this.detailRows = this.detailRows.bind(this);
        this.onToggleAbstractIconClick = this.onToggleAbstractIconClick.bind(this);
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

    onToggleAbstractIconClick(e){
        this.setState(function({ abstractCollapsed }){
            return { 'abstractCollapsed' : !abstractCollapsed };
        });
    }

    toggleAbstractIcon(publication = this.props.context.produced_in_pub){
        if (!publication || !publication.abstract) return null;
        if (publication && publication.abstract && publication.abstract.length <= 240){
            return null;
        }
        return (
            <i className={"icon abstract-toggle icon-fw icon-" + (this.state.abstractCollapsed ? 'plus' : 'minus')}
                data-tip={this.state.abstractCollapsed ? 'See More' : 'Collapse'} onClick={this.onToggleAbstractIconClick} />
        );
    }

    detailRows(publication = this.props.context.produced_in_pub){
        if (!publication || !object.itemUtil.atId(publication)){
            return [];
        }

        var details = [];

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
                'key' : 'abstract',
                'label' : <span>{ this.toggleAbstractIcon() } Abstract</span>,
                'content' : this.shortAbstract()
            });
        }

        if (typeof publication.date_published === 'string'){
            details.push({
                'label' : 'Published',
                'content' : formatPublicationDate(publication.date_published)
            });
        }

        return details;
    }

    render(){
        var context = this.props.context,
            producedInPubID = (context.produced_in_pub && object.itemUtil.atId(context.produced_in_pub)) || null,
            usedInPublications;

        if (!Array.isArray(context.publications_of_set) || context.publications_of_set.length === 0){
            usedInPublications = [];
        } else if (!producedInPubID){
            usedInPublications = context.publications_of_set;
        } else {
            usedInPublications = _.filter(context.publications_of_set, function(pub){
                var pubID = object.itemUtil.atId(pub);
                if (!pubID || (pubID && pubID === producedInPubID)){
                    return false;
                }
                return true;
            });
        }

        return (
            <div className="publications-section">
                <Publications.DetailBlock publication={context.produced_in_pub} singularTitle="Publication Details">
                    {
                        _.map(this.detailRows(context.produced_in_pub), function({ key, label, content }, i){
                            return (
                                <div className="row details-row" key={ key || label || i }>
                                    <div className="col-xs-2 text-600 text-right label-col">{ label }</div>
                                    <div className="col-xs-10">{ content }</div>
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
