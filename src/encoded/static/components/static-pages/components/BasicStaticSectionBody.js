'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { object, analytics, isServerSide } from './../../util';
import { compiler } from 'markdown-to-jsx';
import { HiGlassPlainContainer } from './../../item-pages/components';
import * as store from './../../../store';
import { OverviewHeadingContainer } from './../../item-pages/DefaultItemView';


export class BasicUserContentBody extends React.PureComponent {

    constructor(props){
        super(props);
        this.state = { 'hasError' : false, 'errorInfo' : null };
    }

    componentDidCatch(err, info){
        this.setState({ 'hasError' : true, 'errorInfo' : info }, ()=>{
            var href = this.props.href;
            if (!href){
                var storeState = store && store.getState();
                href = storeState && storeState.href;
            }
            analytics.exception('Client Error - ' + href + ': ' + err, false);
        });
    }

    itemType(){
        var { context, itemType } = this.props;
        if (itemType && typeof itemType === 'string') return itemType;
        if (!Array.isArray(context['@type'])) throw new Error('Expected an @type on context.');
        if (context['@type'].indexOf('StaticSection') > -1){
            return 'StaticSection';
        } else if (context['@type'].indexOf('HiglassViewConfig') > -1){
            return 'HiglassViewConfig';
        } else {
            throw new Error('Unsupported Item type.');
        }
    }

    render(){
        var { context, markdownCompilerOptions } = this.props;
        if (this.state.hasError){
            return (
                <div className="error">
                    <h4>Error parsing content.</h4>
                </div>
            );
        }

        var itemType = this.itemType();

        if (itemType === 'StaticSection') {
            return <BasicStaticSectionBody content={context.content} filetype={context.filetype} markdownCompilerOptions={markdownCompilerOptions} />;
        } else if (itemType === 'HiglassViewConfig') {
            return <HiGlassPlainContainer viewConfig={context.viewconfig} />;
        } else {
            return (
                <div className="error">
                    <h4>Error determining Item type.</h4>
                </div>
            );
        }
    }

}


export class ExpandableStaticHeader extends OverviewHeadingContainer {

    static propTypes = {
        'context' : PropTypes.object.isRequired
    }

    static defaultProps = _.extend({}, OverviewHeadingContainer.defaultProps, {
        'className' : 'with-background mb-1 mt-1',
        'title'     : "Information",
        'prependTitleIconFxn' : function(open, props){
            if (!props.titleIcon) return null;
            return <i className={"expand-icon icon icon-fw icon-" + props.titleIcon} />;
        },
        'prependTitleIcon' : true
    })

    renderInnerBody(){
        var { context, href } = this.props,
            open = this.state.open,
            isHiGlassDisplay = Array.isArray(context['@type']) && context['@type'].indexOf('HiglassViewConfig') > -1,
            extraInfo = null;

        if (isHiGlassDisplay){
            extraInfo = (
                <div className="extra-info description clearfix pt-08">
                    { context.description }
                    <Button href={object.itemUtil.atId(context)} className="pull-right" data-tip="Open HiGlass Display" style={{ marginTop : -5, marginLeft: 10 }}>
                        <i className="icon icon-fw icon-eye"/>&nbsp;&nbsp;&nbsp;
                        View Larger
                    </Button>
                </div>
            );
        }

        return (
            <div className="static-section-header pt-1 clearfix">
                { extraInfo }
                <BasicUserContentBody context={context} href={href} height={isHiGlassDisplay ? 300 : null} />
            </div>
        );
    }

}


export class UserContentBodyList extends React.PureComponent {

    static defaultProps = {
        'headerElement' : 'h4',
        'headerProps'   : {
            'className' : 'text-500 mt-2'
        }
    };

    contentList(){
        var { contents, headerElement, headerProps } = this.props;
        if (!contents || !Array.isArray(contents) || contents.length === 0) return null;

        return _.filter(_.map(contents, function(c,i,all){
            if (!c || c.error) return null;
            var isCollapsible = c.options && c.options.collapsible;
            return (
                <div className="static-content-item" key={c.name || c.uuid || object.itemUtil.atId(c) || i}>
                    { c.title && !isCollapsible ? React.createElement(headerElement, headerProps, c.title) : null }
                    { c.options && c.options.collapsible ?
                        <ExpandableStaticHeader context={c} defaultOpen={c.options.default_open} title={c.title} />
                        :
                        <BasicUserContentBody context={c} />
                    }
                </div>
            );
        }));
    }

    render(){
        return <div className="static-content-list" children={this.contentList()} />;
    }

}


export class BasicStaticSectionBody extends React.PureComponent {

    static propTypes = {
        "content" : PropTypes.string.isRequired,
        "filetype" : PropTypes.string,
        "element" : PropTypes.string.isRequired,
        "markdownCompilerOptions" : PropTypes.any
    }

    static defaultProps = {
        "filetype" : "md",
        "element" : "div"
    }

    render(){
        var { content, filetype, element, markdownCompilerOptions } = this.props,
            passedProps = _.omit(this.props, 'content', 'filetype', 'children', 'element', 'markdownCompilerOptions');

        if (filetype === 'md'){
            return React.createElement(element, passedProps, compiler(content, markdownCompilerOptions || undefined) );
        } else if (filetype === 'html' && typeof content === 'string'){
            return React.createElement(element, passedProps, object.htmlToJSX(content));
        } else {
            return React.createElement(element, passedProps, content );
        }
    }

}
