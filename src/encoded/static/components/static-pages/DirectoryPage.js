'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { NextPreviousPageSection } from '@hms-dbmi-bgm/shared-portal-components/es/components/static-pages/TableOfContents';
import { parseSectionsContent, StaticEntryContent } from './StaticPage';
import { StaticPageBase } from '@hms-dbmi-bgm/shared-portal-components/es/components/static-pages/StaticPageBase';


export default class DirectoryPage extends React.PureComponent {

    render(){
        const { context } = this.props;
        const childrenHaveChildren = _.any(context.children || [], function(c){
            return c && c.children && c.children.length > 0;
        });
        const content = (context.content || []).length > 0 ? (
            StaticPageBase.renderSections(
                StaticPageBase.defaultProps.entryRenderFxn,
                parseSectionsContent(context),
                { 'childComponent' : StaticEntryContent }
            )
        ) : null;

        return (
            <div id="content" className="container">
                <div className={"static-page static-directory-page" + (childrenHaveChildren ? " directory-page-of-directories" : " leaf-directory")} key="wrapper">
                    <DirectoryBodyGrid {...this.props} childrenHaveChildren={childrenHaveChildren} />
                    { !childrenHaveChildren ? <NextPreviousPageSection context={context} nextTitle="Next Section" previousTitle="Previous Section" /> : null }
                    { content }
                </div>
            </div>
        );
    }

}


export const DirectoryBodyGrid = React.memo(function DirectoryBodyGrid(props){
    const { context : { children = [] }, childrenHaveChildren } = props;
    return (
        <div className={"row grid-of-sections" + (childrenHaveChildren ? ' with-sub-children' : '')}>
            { _.map(children, function(child){
                const atId = object.itemUtil.atId(child);
                return <DirectoryBodyGridItem childrenHaveChildren={childrenHaveChildren} {...child} atId={atId} key={atId} />;
            }) }
        </div>
    );
});

function DirectoryBodyGridItem(props){
    const { childrenHaveChildren, children = [], atId: childID, name, description, display_title } = props;
    const childPageCount = children.length;
    return (
        <div className={"grid-item col-12 col-md-" + (childrenHaveChildren ? '6' : '12') + " col-lg-" + (childrenHaveChildren ? '4' : '12')} key={childID || name}>
            <a href={childID} className="inner">
                <h3 className="text-300 mb-05 mt-05 title-link text-ellipsis-container">{ display_title }</h3>
                { description ?
                    <div className={"page-description" + (childrenHaveChildren ? ' text-ellipsis-container' : '')}>{ description }</div> : null
                }
                { childrenHaveChildren && childPageCount ? <h6 className="section-page-count mt-07 mb-05 text-400 text-right">{ childPageCount }&nbsp; <i className={"icon icon-fw far icon-" + (childPageCount > 1 ? "copy" : "file")}/></h6> : null }
            </a>
        </div>
    );
}

