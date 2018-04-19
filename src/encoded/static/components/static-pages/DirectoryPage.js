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
        return (
            <div className={"static-page static-directory-page" + (childrenHaveChildren ? " directory-page-of-directories" : " leaf-directory")} key="wrapper">
                { true ? <DirectoryBodyGrid {...this.props} childrenHaveChildren={childrenHaveChildren} /> : null }
                { !childrenHaveChildren ? <NextPreviousPageSection context={context} /> : null }
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
        var childPageCount = (child.children || []).length;
        var childID = object.itemUtil.atId(child);
        return (
            <div className="grid-item col-md-4 col-xs-12" key={childID || child.name}>
                <div className="inner" onClick={navigate.bind(navigate, childID)}>
                    <h3 className="text-300 mb-0 mt-07"><a className="title-link" href={childID}>{ child.display_title }</a></h3>
                    { childPageCount ? <h6 className="section-page-count mt-05 mb-05 text-400">{ childPageCount } Pages</h6> : null }
                </div>
            </div>
        );
    }

    render(){
        var { context, childrenHaveChildren } = this.props;
        return <div className={"row grid-of-sections" + (childrenHaveChildren ? ' with-sub-children' : '')} children={_.map(this.props.context.children || [], this.renderGridItem)}/>;
    }

}