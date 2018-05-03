'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { console, object, ajax, navigate } from'./../util';
import StaticPage, { StaticEntry, parseSectionsContent } from './StaticPage';
import { NextPreviousPageSection } from './components';
import * as globals from './../globals';


export default class DirectoryPage extends React.Component {

    render(){
        var { context } = this.props;
        var atId = object.itemUtil.atId(context);
        var childrenHaveChildren = _.any(context.children || [], function(c){
            return c && c.children && c.children.length > 0;
        });

        var content = (context.content || []).length > 0 ? StaticPage.renderSections(StaticPage.defaultProps.entryRenderFxn, parseSectionsContent(context)) : null;

        return (
            <div className={"static-page static-directory-page" + (childrenHaveChildren ? " directory-page-of-directories" : " leaf-directory")} key="wrapper">
                <DirectoryBodyGrid {...this.props} childrenHaveChildren={childrenHaveChildren} />
                { !childrenHaveChildren ? <NextPreviousPageSection context={context} nextTitle="Next Section" previousTitle="Previous Section" /> : null }
                { content }
            </div>
        );
    }

}

globals.content_views.register(DirectoryPage, 'DirectoryPage');


export class DirectoryBodyGrid extends React.Component {

    constructor(props){
        super(props);
        this.renderGridItem = this.renderGridItem.bind(this);
    }

    renderGridItem(child, index, all){
        var childrenHaveChildren = this.props.childrenHaveChildren;
        var childPageCount = (child.children || []).length;
        var childID = object.itemUtil.atId(child);
        return (
            <div className={"grid-item col-xs-12 col-md-" + (childrenHaveChildren ? '4' : '12')} key={childID || child.name}>
                <a href={childID} className="inner">
                    <h3 className="text-300 mb-05 mt-05 title-link text-ellipsis-container">{ child.display_title }</h3>
                    { child.description ?
                        <div className={"page-description" + (childrenHaveChildren ? ' text-ellipsis-container' : '')}>{ child.description }</div> : null
                    }
                    { childrenHaveChildren && childPageCount ? <h6 className="section-page-count mt-07 mb-05 text-400 text-right">{ childPageCount }&nbsp; <i className={"icon icon-fw icon-file" + (childPageCount > 1 ? "s" : "") + "-o"}/></h6> : null }
                </a>
            </div>
        );
    }

    render(){
        var { context, childrenHaveChildren } = this.props;
        return <div className={"row grid-of-sections" + (childrenHaveChildren ? ' with-sub-children' : '')} children={_.map(context.children || [], this.renderGridItem)}/>;
    }

}
