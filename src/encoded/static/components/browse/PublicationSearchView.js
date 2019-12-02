'use strict';

import React, { useMemo, useEffect } from 'react';
import memoize from 'memoize-one';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';

import { SearchView as CommonSearchView } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/SearchView';
import { console, analytics, object, navigate as spcNavigate, valueTransforms } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { TableRowToggleOpenButton } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/table-commons';
import { LocalizedTime } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/LocalizedTime';
import { FlexibleDescriptionBox } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/FlexibleDescriptionBox';
import { Detail } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/ItemDetailList';

import { columnExtensionMap } from './columnExtensionMap';
import { Schemas } from './../util';

import { transformedFacets } from './SearchView';


const publicationColExtensionMap = _.extend({}, columnExtensionMap, {
    // We override display_title for this view to be wider.
    // And awesomer.
    "display_title" : {
        "widthMap" : { "sm" : 320, "md" : 520, "lg" : 640 },
        'minColumnWidth' : 200,
        "render" : function(result, columnDefinition, props, termTransformFxn){
            return <PublicationSearchResultTitle {...props} {...{ result }} />;
        }
    },
    "date_published" : {
        "widthMap" : { "sm" : 60, "md" : 60, "lg" : 60 },
        "render" : function(result, columnDefinition, props, termTransformFxn){
            const { date_published = null } = result;
            if (!date_published) return null;
            return (
                <span className="value">
                    <LocalizedTime timestamp={date_published} formatType="date-year" />
                </span>
            );
        }
    },
    "journal" : {
        "widthMap" : { "sm" : 100, "md" : 120, "lg" : 150 },
        "render" : function(result, columnDefinition, props, termTransformFxn){
            const { journal = null } = result;
            if (!journal) return null;
            return (
                <span className="value">
                    <JournalTitle journal={journal} width={props.width} />
                </span>
            );
        }
    },
    "number_of_experiment_sets" : {
        "colTitle" : "Exp Sets",
        "widthMap" : { "sm" : 50, "md" : 70, "lg" : 80 },
        "render" : function(result, columnDefinition, props, termTransformFxn){
            const { number_of_experiment_sets: numSets = null } = result;
            if (numSets === null) return null;
            return (
                <span className="value">
                    { valueTransforms.decorateNumberWithCommas(numSets) }
                </span>
            );
        }
    },
    "award.project" : {
        "widthMap" : { "sm" : 60, "md" : 70, "lg" : 80 }
    },
});

/**
 * This is memoized into a couple of different functions - 1 per column (common colWidth between all cells in same col)
 * Make sure to keep this in sync with CSS rules (line height, etc.)
 */
function maxCharsToShowPerLine(colWidth){
    const charWidth = 6; // Rough upper estimate (excl "i", "l", ".", etc.) for this font/size/weight
    // -16px for table cell padding (8px left + right)
    const textAreaWidth = colWidth - 60 - 16; // Account for line splitting on spaces (not in middle of words)
    return Math.floor(textAreaWidth / charWidth);
}


class PublicationSearchResultTitle extends React.PureComponent {

    static maxCharsToShowPerLine = memoize(maxCharsToShowPerLine);

    static defaultProps = {
        "showAbstractBlock" : false
    };

    constructor(props){
        super(props);
        this.onClickTrack = this.onClickTrack.bind(this);
    }

    onClickTrack(evt){
        const { result, href, navigate = spcNavigate, rowNumber } = this.props;
        evt.preventDefault();
        evt.stopPropagation();
        analytics.productClick(result, {
            'list'      : analytics.hrefToListName(href),
            'position'  : rowNumber + 1
        }, function(){
            navigate(object.itemUtil.atId(result));
        });
        return false;
    }

    render(){
        const { result, detailOpen, toggleDetailOpen, width: colWidth, showAbstractBlock } = this.props;
        const {
            title: origTitle, // We use "title" here, not "display_title" (which contains year+author, also)
            "@id" : id,
            abstract = null,
            authors = null
        } = result;
        const charsPerLine = PublicationSearchResultTitle.maxCharsToShowPerLine(colWidth - 45); // -45 re: ToggleBtn width
        const titleLen = origTitle.length;
        const titleMaxLen = charsPerLine * 3; // 3 lines max for it
        let title = origTitle;
        if (titleLen > titleMaxLen) {
            title = title.slice(0, titleMaxLen) + "...";
        }

        return (
            <React.Fragment>
                <TableRowToggleOpenButton onClick={toggleDetailOpen} open={detailOpen} />
                <div className="title-inner overflow-hidden">
                    <h5 className="mt-0 mb-0 text-500">
                        <a href={id} onClick={this.onClickTrack}>{ title }</a>
                    </h5>
                    <AuthorsBlock authors={authors} maxCharacters={titleMaxLen} />
                    <AbstractBlock enabled={showAbstractBlock} {...{ abstract, charsPerLine, titleLen, authors, colWidth, titleMaxLen }} />
                </div>
            </React.Fragment>
        );
    }
}

/** Currently disabled */
const AbstractBlock = React.memo(function({ enabled, authors, titleLen, titleMaxLen, abstract: origAbstract, charsPerLine, colWidth }){
    if (!enabled) return null;

    const authorsLen = useMemo(function(){
        if (!Array.isArray(authors)) return 0;
        const initAuthors = authors.slice(0);
        let charCount = 0;
        while (initAuthors.length){
            const author = initAuthors.shift();
            const authorLen = author.length;
            charCount += authorLen;
            charCount += 2; // Space & comma
        }
        charCount -2;
        return charCount;
    }, [authors]);

    const titleFitsOnOneLine = titleLen < charsPerLine;
    const authorsFitOnOneLine = authorsLen < charsPerLine;

    let showAbstract = null;
    let abstractMaxLen;
    if (origAbstract && authorsFitOnOneLine && titleFitsOnOneLine){
        abstractMaxLen = titleMaxLen;
        showAbstract = origAbstract;
        if (showAbstract.length > abstractMaxLen) {
            showAbstract = showAbstract.slice(0, abstractMaxLen) + "...";
        }
    }

    if (showAbstract) {
        return <p className="abstract mb-0 mt-08">{ showAbstract }</p>;
    }

    const doubleCharsPerLine = charsPerLine * 2;
    const titleFitsOn2Lines = titleLen < doubleCharsPerLine;
    const authorsFitOn2Lines = authorsLen < doubleCharsPerLine;

    if (origAbstract && colWidth > 450 && (titleFitsOn2Lines || authorsFitOn2Lines)){
        return  <div className="abstract-exists-indicator">Expand column width to see more</div>;
    }

});


const AuthorsBlock = React.memo(function AuthorsBlock(props){
    const { maxCharacters: maxCharLen = 20, authors = [] } = props;
    const initAuthorsLen = authors.length;
    if (initAuthorsLen === 0) {
        return (
            <div className="authors-list">
                <em>No Authors</em>
            </div>
        );
    }
    const initAuthors = authors.slice(0);
    const authorsToKeep = [];
    let charCount = 0;
    while (charCount < maxCharLen && initAuthors.length){
        const author = initAuthors.shift();
        const authorLen = author.length;
        charCount += authorLen;
        if (initAuthors.length > 0){
            charCount += 2; // Comma + space
        }
        if (charCount < maxCharLen) {
            authorsToKeep.push(author);
        } else {
            break;
        }
    }
    const authorsAreTrimmed = authorsToKeep.length < initAuthorsLen;
    return (
        <div className="authors-list">
            {
                authorsToKeep.map(function(authorStr, i){
                    return <span className="author-name" key={authorStr}>{ authorStr }</span>;
                })
            }
            { authorsAreTrimmed ? <span className="author-name"><em>et al.</em></span> : null }
        </div>
    );
});


const JournalTitle = React.memo(function JournalTitle({ journal, width: colWidth }){

    // Not memoized since this component itself is memoized with only real dynamic prop being colWidth.
    const maxCharsPerLine = maxCharsToShowPerLine(colWidth);
    const maxChars = maxCharsPerLine * 5;
    const journalLen = journal.length;

    if (journalLen > maxChars) {
        return <span className="value">{ journal.slice(0, maxChars).trim() + "..." }</span>;
    }

    if (journalLen > (maxChars - (maxCharsPerLine - 20))) {
        // check if ~ >= lines worth of extra space in case line break causes to not fit (e.g. title is only few chars)
        return <span className="value">{ journal }</span>;
    }

    const [ , journalTitle, journalAttribution ] = useMemo(function(){
        // Check if in form of "Title (Attribution content)" and split on first paren
        const splitParenPattern = new RegExp("^([^(]+\\s)(\\(.+\\))$");
        return journal.split(splitParenPattern);
    }, [journal]);

    if (typeof journalAttribution === "string"){
        return (
            <span className="value">
                <span className="d-block text-500">{ journalTitle.trim() }</span>
                <span className="d-block">{ journalAttribution }</span>
            </span>
        );
    }

    return <span className="value text-500">{ journal }</span>;
});



export function PublicationDetailPane(props){
    const { result, schemas } = props;
    const { abstract = null } = result;

    // If we pass empty array as 2nd arg, the `useEffect` hook should act exactly like componentDidMount
    // See last "Note" under https://reactjs.org/docs/hooks-effect.html as well as this article - https://medium.com/@felippenardi/how-to-do-componentdidmount-with-react-hooks-553ba39d1571
    useEffect(function(){
        ReactTooltip.rebuild(); // Rebuild tooltips, many of which are present on `Detail` list.
    }, []);

    return (
        <div className="mr-1">
            { !abstract ? null : (
                <div className="flex-description-container">
                    <h5><i className="icon icon-fw icon-align-left mr-08 fas"/>Abstract</h5>
                    <p className="text-normal ml-27 mt-1">{ abstract }</p>
                    <hr className="desc-separator" />
                </div>
            )}
            <h5 className="text-500 mb-0 mt-16">
                <i className="icon icon-fw icon-list fas mr-08"/>Details
            </h5>
            <div className="item-page-detail ml-27">
                <Detail context={result} open={false} schemas={schemas} excludedKeys={PublicationDetailPane.excludedKeys} />
            </div>
        </div>
    );
}
PublicationDetailPane.excludedKeys = [
    ...Detail.defaultProps.excludedKeys,
    "title", "abstract", "authors", "short_attribution", "static_content",
    "submitted_by", "published_by", "exp_sets_prod_in_pub", "exp_sets_used_in_pub", "public_release"
];


export default class PublicationSearchView extends React.PureComponent {

    constructor(props){
        super(props);
        this.renderDetailPane = this.renderDetailPane.bind(this);
        this.memoized = {
            transformedFacets: memoize(transformedFacets)
        };
    }

    renderDetailPane(result){
        const { schemas } = this.props;
        return (
            <PublicationDetailPane {...{ result, schemas }} />
        );
    }

    render(){
        const { isFullscreen, href, context, currentAction, session, schemas } = this.props;
        const facets = this.memoized.transformedFacets(href, context, currentAction, session, schemas);
        const tableColumnClassName = "expset-result-table-fix col-12" + (facets.length > 0 ? " col-sm-7 col-lg-8 col-xl-" + (isFullscreen ? '10' : '9') : "");
        const facetColumnClassName = "col-12 col-sm-5 col-lg-4 col-xl-" + (isFullscreen ? '2' : '3');
        return (
            <div className="container" id="content">
                <CommonSearchView {...this.props} {...{ tableColumnClassName, facetColumnClassName, facets }} renderDetailPane={this.renderDetailPane}
                    termTransformFxn={Schemas.Term.toName} separateSingleTermFacets rowHeight={150} openRowHeight={150} columnExtensionMap={publicationColExtensionMap} />
            </div>
        );
    }
}

