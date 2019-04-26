'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Button } from 'react-bootstrap';
import { object, analytics, isServerSide } from './../../util';
import { compiler } from 'markdown-to-jsx';
import { OverviewHeadingContainer } from './../../item-pages/components/OverviewHeadingContainer';
import { HiGlassAjaxLoadContainer, isHiglassViewConfigItem } from './../../item-pages/components/HiGlass';
import * as store from './../../../store';
import { replaceString as replacePlaceholderString } from './../placeholders';



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

    /** Determines the item type from the context. */
    itemType(){
        var { context, itemType } = this.props;
        if (itemType && typeof itemType === 'string') return itemType;
        if (!Array.isArray(context['@type'])) throw new Error('Expected an @type on context.');
        if (context['@type'].indexOf('StaticSection') > -1){
            return 'StaticSection';
        } else if (isHiglassViewConfigItem(context)){ // Func internally checks context['@type'].indexOf('HiglassViewConfig') > -1 also
            return 'HiglassViewConfig';
        } else {
            // TODO: Case for JupyterNotebook (?) and/or yet-to-be-created ones.
            throw new Error('Unsupported Item type.');
        }
    }

    render(){
        var { context, markdownCompilerOptions, parentComponentType } = this.props;
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
            return (
                <React.Fragment>
                    <EmbeddedHiglassActions context={context} parentComponentType={parentComponentType || BasicUserContentBody}/>
                    <HiGlassAjaxLoadContainer {..._.omit(this.props, 'context', 'higlassItem')} higlassItem={context} />
                </React.Fragment>
            );
        } else {
            // TODO handle @type=JupyterHub?
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
    };

    static defaultProps = _.extend({}, OverviewHeadingContainer.defaultProps, {
        'className' : 'with-background mb-1 mt-1',
        'title'     : "Information",
        'prependTitleIconFxn' : function prependedIcon(open, props){
            if (!props.titleIcon) return null;
            return <i className={"expand-icon icon icon-fw icon-" + props.titleIcon} />;
        },
        'prependTitleIcon' : true
    });

    renderInnerBody(){
        var { context, href } = this.props,
            open        = this.state.open,
            isHiGlass   = isHiglassViewConfigItem(context);

        return (
            <div className="static-section-header pt-1 clearfix">
                <BasicUserContentBody context={context} href={href} height={isHiGlass ? 300 : null} parentComponentType={ExpandableStaticHeader} />
            </div>
        );
    }
}


export class EmbeddedHiglassActions extends React.PureComponent {

    static defaultProps = {
        'parentComponentType' : BasicUserContentBody,
        'showDescription' : true,
        'constrainDescription' : false
    };

    render(){
        const { context, parentComponentType, showDescription, constrainDescription } = this.props;
        const btnProps = {
            'href'      : object.itemUtil.atId(context),
            'data-tip'  : "Open HiGlass display to add other data",
            'className' : 'pull-right extra-info-higlass-btn'
        };

        if (parentComponentType === BasicUserContentBody) {
            btnProps.bsSize = 'sm';
        }

        return (
            // Styled as flexrow, which will keep btn-container aligned to right as long as the ".description" container is present.
            <div className="extra-info extra-info-for-higlass-display" {..._.omit(this.props, 'context', 'showDescription', 'parentComponentType')}>
                <div className={"description" + (constrainDescription ? ' text-ellipsis-container' : '')} >
                    { showDescription ? context.description : null }
                </div>
                <div className="btn-container">
                    <Button {...btnProps}>
                        <i className="icon icon-fw icon-eye"/>&nbsp;&nbsp;&nbsp;
                        Explore Data
                    </Button>
                </div>
            </div>
        );
    }
}


export class UserContentBodyList extends React.PureComponent {

    static defaultProps = {
        'hideTitles'        : false,
        'headerElement'     : 'h4',
        'headerProps'       : {
            'className'         : 'text-500 mt-2'
        },
        'allCollapsible'    : null
    };

    contentList(){
        var { contents, headerElement, headerProps, allCollapsible, href, hideTitles } = this.props;
        if (!contents || !Array.isArray(contents) || contents.length === 0) return null;

        return _.filter(_.map(contents, function(c,i,all){
            if (!c || c.error) return null;

            // If props.allCollapsible is a boolean, let it override whatever section option is.
            var isCollapsible = (allCollapsible === true) || (allCollapsible !== false && c.options && c.options.collapsible);

            return (
                <div className="static-content-item" key={c.name || c.uuid || object.itemUtil.atId(c) || i}>
                    { !hideTitles && c.title && !isCollapsible ? React.createElement(headerElement, headerProps, c.title) : null }
                    { isCollapsible ?
                        <ExpandableStaticHeader context={c} defaultOpen={c.options.default_open} title={c.title} href={href} titleTip={c.description} />
                        :
                        <BasicUserContentBody context={c} href={href} />
                    }
                </div>
            );
        }));
    }

    render(){
        return <div className="static-content-list">{ this.contentList() }</div>;
    }

}


export class BasicStaticSectionBody extends React.PureComponent {

    static propTypes = {
        "content" : PropTypes.string.isRequired,
        "filetype" : PropTypes.string,
        "element" : PropTypes.string.isRequired,
        "markdownCompilerOptions" : PropTypes.any
    };

    static defaultProps = {
        "filetype" : "md",
        "element" : "div"
    };

    render(){
        var { content, filetype, element, markdownCompilerOptions } = this.props,
            passedProps = _.omit(this.props, 'content', 'filetype', 'children', 'element', 'markdownCompilerOptions');

        if (filetype === 'md' && typeof content === 'string'){
            return React.createElement(element, passedProps, compiler(content, markdownCompilerOptions || undefined) );
        } else if (filetype === 'html' && typeof content === 'string'){
            return React.createElement(element, passedProps, object.htmlToJSX(content));
        } else if (filetype === 'jsx' && typeof content === 'string'){
            return replacePlaceholderString(content.trim());
        } else if (filetype === 'txt' && typeof content === 'string' && content.slice(0,12) === 'placeholder:'){
            // Deprecated older method - to be removed once data.4dn uses filetype=jsx everywhere w/ placeholder
            return replacePlaceholderString(content.slice(12).trim());
        } else {
            return React.createElement(element, passedProps, content);
        }
    }

}
