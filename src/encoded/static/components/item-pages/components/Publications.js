'use strict';

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { console, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { formatPublicationDate } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/LocalizedTime';
import { FormattedInfoWrapper, WrappedCollapsibleList } from './FormattedInfoBlock';



/**
 * Display a FormattedInfoBlock-style block with custom detail (defined via props.children).
 *
 * @prop {string} singularTitle         - Title to show in top left of block. 'S' gets added to end of title if more than 1 item.
 * @prop {Object} publication           - Publication whose link and display_title to display.
 * @prop {Element|Element[]} children   - React Element(s) to display in detail area under title.
 */
const DetailBlock = React.memo(function DetailBlock(props){
    const { publication = null, singularTitle, children } = props;
    const publicationHref = object.itemUtil.atId(publication);
    if (!publication || !publicationHref) return null; // Is case if no view permission for Publiation, as well.

    // TODO maybe remove ellipsis on this and show full/longer `title`.
    const { display_title } = publication;

    return (
        <FormattedInfoWrapper singularTitle={singularTitle} isSingleItem>
            <h5 className="block-title">
                <a href={publicationHref}>{ display_title }</a>
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
 * Shows publications for current Item. Rendered by AttributionTabView.js.
 * Currently, only ExperimentSet seems to have publications so this is present only on Component module:item-pages/ExperimentSetView.
 */
export const Publications = React.memo(function Publications({ context }){

    // See https://css-tricks.com/run-useeffect-only-once/
    useEffect(function(){
        ReactTooltip.rebuild();
    }, [ context ]);

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
            <DetailBlock publication={produced_in_pub} singularTitle="Publication Details">
                <PublicationDetailRows publication={produced_in_pub} />
            </DetailBlock>
            <WrappedCollapsibleList items={usedInPublications} singularTitle="Used in Publication" itemClassName="publication" />
        </div>
    );
});
Publications.DetailBlock = DetailBlock;
Publications.ShortAttribution = ShortAttribution;
Publications.PublicationBelowHeaderRow = PublicationBelowHeaderRow;


const PublicationDetailRows = React.memo(function PublicationDetailRows({ publication }){

    const [ abstractCollapsed, setAbstractCollapsed ] = useState(true);

    if (!publication || !object.itemUtil.atId(publication)){
        return [];
    }

    const {
        authors,
        abstract = null,
        date_published
    } = publication;


    const details = [];

    if (typeof authors === 'string'){
        // Deprecated?
        details.push({
            'label' : 'Authors',
            'content' : publication.authors
        });
    } else if (Array.isArray(authors) && authors.length > 0){
        details.push({
            'label' : 'Author' + (authors.length > 1 ? 's' : ''),
            'content' : authors.join(', ')
        });
    }

    if (abstract && typeof abstract === 'string') {
        let toggleAbstractIcon = null;
        let showAbstract = abstract;

        if (abstract.length > 240) {
            toggleAbstractIcon = (
                <i className={"icon abstract-toggle icon-fw fas icon-" + (abstractCollapsed ? 'plus' : 'minus')}
                    data-tip={abstractCollapsed ? 'See More' : 'Collapse'} onClick={function(){ setAbstractCollapsed(!abstractCollapsed); }} />
            );
            showAbstract = !abstractCollapsed ? abstract : abstract.slice(0, 238) + '...';
        }

        details.push({
            'key' : 'abstract',
            'label' : <span>{ toggleAbstractIcon } Abstract</span>,
            'content' : showAbstract
        });

        toggleAbstractIcon = (
            <i className={"icon abstract-toggle icon-fw fas icon-" + (abstractCollapsed ? 'plus' : 'minus')}
                data-tip={abstractCollapsed ? 'See More' : 'Collapse'} onClick={function(){ setAbstractCollapsed(!abstractCollapsed); }} />
        );
    }

    if (typeof date_published === 'string'){
        details.push({
            'label' : 'Published',
            'content' : formatPublicationDate(date_published)
        });
    }

    return details.map(function({ key, label, content }, idx){
        return (
            <div className="row details-row" key={ key || label || idx }>
                <div className="col-2 text-600 text-right label-col">{ label }</div>
                <div className="col-10">{ content }</div>
            </div>
        );
    });
});
