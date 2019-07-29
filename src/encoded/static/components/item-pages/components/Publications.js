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
const DetailBlock = React.memo(function DetailBlock(props){
    const { publication, singularTitle, children } = props;
    if (!publication || !object.itemUtil.atId(publication)) return null;

    let title = publication.display_title;
    const url = object.itemUtil.atId(publication);

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
});
DetailBlock.defaultProps = {
    'singularTitle' : 'Publication'
};

const ShortAttribution = React.memo(function ShortAttribution({ publication : pub }){
    if (!pub || !object.itemUtil.atId(pub)) return null;
    const { authors = [], journal = null, date_published = null } = pub;
    const authorsLen = authors.length;

    let authorsString = null;
    if (authorsLen > 0){
        if (authorsLen === 1){
            authorsString = pub.authors[0];
        } else {
            authorsString = pub.authors[0];
            if (pub.authors[1]) authorsString += ', ' + pub.authors[1];
            if (pub.authors[2]) authorsString += ', et al.';
        }
    }

    if (journal){
        authorsString += ', ';
    }

    let yearPublished = null;
    try {
        if (date_published && typeof date_published === 'string'){
            yearPublished = formatPublicationDate(date_published, false);
        }
        if (journal && yearPublished){
            yearPublished = ' ' + yearPublished;
        }
    } catch (e){
        yearPublished = null;
    }

    return (
        <span>
            { authorsString }
            { journal? <em>{ journal }</em> : null }
            { yearPublished }
        </span>
    );
});
ShortAttribution.propTypes = {
    'publication'   : PropTypes.shape({
        'authors'       : PropTypes.arrayOf(PropTypes.string),
        'journal'       : PropTypes.string,
        'date_published': PropTypes.string
    }).isRequired
};


/**
 * @todo
 * Maybe get rid of `<div className={outerClassName}>` completely and allow parent/containing
 * component to create own <div> with whatever className is desired, among other element attributes.
 */
const PublicationBelowHeaderRow = React.memo(function PublicationBelowHeaderRow({ publication, singularTitle, outerClassName }){
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
});
PublicationBelowHeaderRow.defaultProps = {
    'singularTitle' : "Source Publication",
    'outerClassName' : "mb-2"
};

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
            <i className={"icon abstract-toggle icon-fw fas icon-" + (this.state.abstractCollapsed ? 'plus' : 'minus')}
                data-tip={this.state.abstractCollapsed ? 'See More' : 'Collapse'} onClick={this.onToggleAbstractIconClick} />
        );
    }

    detailRows(){
        const { context : { produced_in_pub : publication } } = this.props;
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
        const { context } = this.props;
        const { produced_in_pub = null, publications_of_set = [] } = context || {};
        const producedInPubID = (produced_in_pub && object.itemUtil.atId(produced_in_pub)) || null;
        let usedInPublications;

        if (publications_of_set.length === 0){
            usedInPublications = [];
        } else if (!producedInPubID){
            usedInPublications = publications_of_set;
        } else {
            usedInPublications = _.filter(publications_of_set, function(pub){
                const pubID = object.itemUtil.atId(pub);
                if (!pubID || (pubID && pubID === producedInPubID)){
                    return false;
                }
                return true;
            });
        }

        return (
            <div className="publications-section">
                <Publications.DetailBlock publication={produced_in_pub} singularTitle="Publication Details">
                    {
                        _.map(this.detailRows(produced_in_pub), function({ key, label, content }, i){
                            return (
                                <div className="row details-row" key={ key || label || i }>
                                    <div className="col-2 text-600 text-right label-col">{ label }</div>
                                    <div className="col-10">{ content }</div>
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
