'use strict';

import React from 'react';
import memoize from 'memoize-one';
import _ from 'underscore';

import { SearchView as CommonSearchView } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/SearchView';
import { console, analytics, object, navigate as spcNavigate } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { TableRowToggleOpenButton } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/table-commons';

import { columnExtensionMap } from './columnExtensionMap';
import { Schemas } from './../util';

import { transformedFacets } from './SearchView';


const publicationColExtensionMap = _.extend({}, columnExtensionMap, {
    // We override display_title for this view to be wider.
    // And awesomer.
    "display_title" : {
        "widthMap" : { "sm" : 150, "md" : 300, "lg" : 520 },
        "render" : function(result, columnDefinition, props, termTransformFxn, width){
            return <PublicationSearchResultTitle {...props} {...{ result }} />;
        }
    }
});


class PublicationSearchResultTitle extends React.PureComponent {

    /**
     * Re-used for all titles - keep this in sync with CSS rules (line height, etc.)
     * We could try to be smarter and like, roughly measure each character of alphabet or something, but... probably not worth it for now.
     */
    static maxCharsToShowPerLineBody = memoize(function(colWidth){
        const charWidth = 6; // Rough upper estimate (excl "i", "l", ".", etc.)
        const textAreaWidth = colWidth - 90; // Account for ToggleButton + cell padding, and line splitting on spaces (not in middle of words)
        return Math.floor(textAreaWidth / charWidth);
    });

    static maxCharsToShowForTitle = memoize(function(colWidth){
        const charWidth = 7; // Rough upper estimate (excl "i", "l", ".", etc.)
        const textAreaWidth = colWidth - 90; // Account for ToggleButton + cell padding, and line splitting on spaces (not in middle of words)
        return Math.floor(textAreaWidth / charWidth);
    });

    constructor(props){
        super(props);
        this.onClickTrack = this.onClickTrack.bind(this);
    }

    onClickTrack(evt){
        const { result, href, navigate = spcNavigate } = this.props;
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
        const { result, detailOpen, toggleDetailOpen, rowNumber, href, navigate = spcNavigate, width: colWidth } = this.props;
        const { title: origTitle, "@id" : id, abstract, authors = null } = result; // We use "title" here, not "display_title" (which contains year+author, also)
        const titleLen = abstract.length;
        const titleMaxLen = PublicationSearchResultTitle.maxCharsToShowForTitle(colWidth) * 3;
        let title = abstract;
        if (titleMaxLen > titleLen) {
            title = title.slice(0, titleMaxLen) + "...";
        }
        //const abstract = abstractLen < charsToShow ? origAbstract : origAbstract.slice(0, charsToShowPerLine) + "...";
        let authorsBlock;

        if (Array.isArray(authors) && authors.length > 0){
            authorsBlock = (
                <div className="authors-list text-ellipsis-container mb-08">
                    { authors.join(", ") }
                </div>
            );
        }

        console.log('TTT', result, colWidth, titleMaxLen, title.length);
        //const
        return (
            <React.Fragment>
                <TableRowToggleOpenButton onClick={toggleDetailOpen} open={detailOpen} />
                <div className="title-inner overflow-hidden">
                    <h5 className="mt-0 mb-0 text-500">
                        <a href={id} onClick={this.onClickTrack}>{ title }</a>
                    </h5>
                    { authorsBlock }
                    {/* <p className="abstract mb-0">{ abstract }</p> */}
                </div>
            </React.Fragment>
        );
    }
}


export default class PublicationSearchView extends React.PureComponent {

    constructor(props){
        super(props);
        this.memoized = {
            transformedFacets: memoize(transformedFacets)
        };
    }

    render(){
        const { isFullscreen, href, context, currentAction, session, schemas } = this.props;
        const facets = this.memoized.transformedFacets(href, context, currentAction, session, schemas);
        const tableColumnClassName = "expset-result-table-fix col-12" + (facets.length > 0 ? " col-sm-7 col-lg-8 col-xl-" + (isFullscreen ? '10' : '9') : "");
        const facetColumnClassName = "col-12 col-sm-5 col-lg-4 col-xl-" + (isFullscreen ? '2' : '3');
        return (
            <div className="container" id="content">
                <CommonSearchView {...this.props} {...{ tableColumnClassName, facetColumnClassName, facets }}
                    termTransformFxn={Schemas.Term.toName} separateSingleTermFacets rowHeight={175} columnExtensionMap={publicationColExtensionMap} />
            </div>
        );
    }
}

