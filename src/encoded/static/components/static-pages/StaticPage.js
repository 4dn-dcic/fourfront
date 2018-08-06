'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { compiler } from 'markdown-to-jsx';
import Alerts from './../alerts';
import { CSVMatrixView, TableOfContents, MarkdownHeading, placeholders, HeaderWithLink } from './components';
import * as globals from './../globals';
import { layout, console, object, isServerSide } from './../util';


/**
 * Converts context.content into different format if necessary and returns copy of context with updated 'content'.
 * Currently only converts Markdown content (if a context.content[] item has 'filetype' === 'md'). Others may follow.
 *
 * @param {Object} context - Context provided from back-end, including all properties.
 */
export function parseSectionsContent(context = this.props.context){

    function parse(section){
        if (section.filetype === 'md'){ // If Markdown, we convert 'section.content' to JSX elements.
            var content = compiler(section.content, {
                'overrides' : _.object(_.map(['h1','h2','h3','h4', 'h5', 'h6'], function(type){
                    return [type, {
                        'component' : MarkdownHeading,
                        'props'     : { 'type' : type }
                    }];
                }))
            });
            section =  _.extend({}, section, { 'content' : content });
        }
        // TODO: other parsing stuff based on other filetypes.
        // Else: return the plaintext representation.
        return section;
    }

    if (!Array.isArray(context.content)) throw new Error('context.content is not an array.');

    return _.extend(
        {}, context, {
            'content' : _.map(
                _.filter(context.content || [], function(section){ return section && section.content && !section.error; }),
                parse
            )
        });
}


/**
 * Converts links to other files into links to sections from a React element and its children (recursively).
 *
 * @param {JSX.Element} elem - A high-level React element representation of some content which might have relative links.
 * @param {{ 'content' : { 'name' : string } }} context - Backend-provided data.
 * @param {number} depth - Current depth.
 * @returns {JSX.Element} - Copy of original 'elem' param with corrected links.
 */
export function correctRelativeLinks(elem, context, depth = 0){
    if (typeof elem !== 'object' || !elem) return elem; // Could be a string, or null.
    if (elem.type === 'a'){
        var href = elem.props.href;
        if (
            typeof href === 'string' &&
            href.charAt(0) !== '#' &&
            href.charAt(0) !== '/' &&
            href.slice(0,4) !== 'http' &&
            href.slice(0,7) !== 'mailto:'
        ){ // We have a relative href link.
            if (href.indexOf('#') > -1){ // It references a title on some other page or section. Likely, this is section is on same page, so we can just use that.
                var parts = href.split('#');
                if (parts.length > 1){
                    href = '#' + parts[1];
                }
            } else { // Check if is name of a section, and if so, correct.
                var filenameWithoutExtension = href.split('.').slice(0, -1).join('.');
                if (typeof _.find(context.content, { 'name' : filenameWithoutExtension }) !== 'undefined'){
                    href = '#' + filenameWithoutExtension;
                }
            }
        }

        if (href !== elem.props.href || href.charAt(0) === '#'){
            return React.cloneElement(
                elem,
                _.extend(_.omit(elem.props, 'children'), {
                    'href' : href,
                    'onClick' : href.charAt(0) !== '#' ? null : function(e){
                        e.preventDefault();
                        layout.animateScrollTo(href.slice(1));
                    }
                }),
                elem.props.children || null
            );
        } else return elem;
    } else if (elem.props.children && typeof elem.type === 'string') {
        return React.cloneElement(
            elem,
            _.omit(elem.props, 'children'),
            React.Children.map(elem.props.children, function(child){
                return correctRelativeLinks(child, context, depth + 1);
            })
        );
    } else return elem;
}







class Wrapper extends React.PureComponent {

    static defaultProps = {
        'contentColSize' : 12,
        'tableOfContents' : false,
        'tocListStyles' : ['decimal', 'lower-alpha', 'lower-roman']
    };

    contentColSize(){
        return Math.min(
            this.props.tableOfContents ? 9 : 12,
            Math.max(6, this.props.contentColSize) // Min 6.
        );
    }

    renderToC(){
        if (!this.props.tableOfContents || this.props.tableOfContents.enabled === false) return null;
        var contentColSize = this.contentColSize();
        var context = this.props.context;
        var toc = context['table-of-contents'] || (this.props.tableOfContents && typeof this.props.tableOfContents === 'object' ? this.props.tableOfContents : {});
        var title = this.props.title || (context && context.title) || null;
        return (
            <div key="toc-wrapper" className={'pull-right col-xs-12 col-sm-12 col-lg-' + (12 - contentColSize)}>
                <TableOfContents
                    context={context}
                    pageTitle={title}
                    fixedGridWidth={12 - contentColSize}
                    navigate={this.props.navigate}
                    href={this.props.href}
                    //skipDepth={1}
                    maxHeaderDepth={toc['header-depth'] || 6}
                    //includeTop={toc['include-top-link']}
                    //listStyleTypes={['none'].concat((toc && toc['list-styles']) || this.props.tocListStyles)}
                />
            </div>
        );
    }

    render(){

        var title = this.props.title || (this.props.context && this.props.context.title) || null;
        var contentColSize = this.contentColSize();
        var mainColClassName = "col-xs-12 col-sm-12 col-lg-" + contentColSize;

        return (
            <div className="static-page row" key="wrapper">
                { this.renderToC() }
                <div key="main-column" className={mainColClassName} children={this.props.children}/>
            </div>
        );
    }
}


export class StaticEntry extends React.PureComponent {

    static defaultProps = {
        'section'   : null,
        'content'   : null,
        'entryType' : 'help',
        'className' : null
    }

    constructor(props){
        super(props);
        this.replacePlaceholder = this.replacePlaceholder.bind(this);
        this.renderEntryContent = this.renderEntryContent.bind(this);
        this.render = this.render.bind(this);
    }

    replacePlaceholder(placeholderString){
        if (placeholderString === '<SlideCarousel/>'){
            return (<placeholders.SlideCarousel />);
        }
        return placeholderString;
    }

    renderEntryContent(baseClassName){
        var content  = (this.props.content && this.props.content.content)  || null;
        if (!content) return null;

        var filetype = this.props.content.filetype || null;
        var placeholder = false;

        if (typeof content === 'string' && content.slice(0,12) === 'placeholder:'){
            placeholder = true;
            content = this.replacePlaceholder(content.slice(12).trim().replace(/\s/g,'')); // Remove all whitespace to help reduce any typo errors.
        }

        var className ="section-content" + (baseClassName? ' ' + baseClassName : '');

        if (filetype === 'csv'){
            return <CSVMatrixView csv={content} options={this.props.content.options} />;
        } else if (placeholder || (filetype === 'md')){
            content = correctRelativeLinks(content, this.props.context);
            //console.log(this.props.section, content, this.props.context);
            return <div className={className}>{ content }</div>;
        } else {
            return <div className={className} dangerouslySetInnerHTML={{__html: content }}></div>;
        }
    }

    render(){
        var { content, entryType, sectionName, className } = this.props;
        var id = TableOfContents.elementIDFromSectionName(sectionName);
        return (
            <div className={entryType + "-entry static-section-entry"} id={id}>
                { content && content.title ?
                    <HeaderWithLink className="section-title" link={id} context={this.props.context}>{ content.title }</HeaderWithLink>
                : null }
                { this.renderEntryContent(className) }
            </div>
        );
    }

}


export default class StaticPage extends React.PureComponent {

    static Entry = StaticEntry

    static Wrapper = Wrapper

    static renderSections(renderMethod, parsedContent){
        if (!parsedContent || !parsedContent.content || !Array.isArray(parsedContent.content)){
            console.error('No content defined for page', parsedContent);
            return null;
        }
        return _.map(parsedContent.content, function(section){ return renderMethod(section.id || section.name, section, parsedContent); });
    }

    static defaultProps = {
        "context" : {
            "title" : "Page Title",
            "content" : {
                "sectionNameID1" : {
                    "order"      : 0,
                    "title"      : "Section Title 1",
                    "content"    : "<h2>Hello</h2>",
                    "filetype"   : "html"
                },
                "sectionNameID2" : {
                    "order"      : 1,
                    "title"      : "Section Title 2",
                    "content"    : "<h2>World</h2>",
                    "filetype"   : "html"
                }
            }
        },
        'entryRenderFxn' : function(sectionName, content, context){
            return <StaticEntry key={sectionName} sectionName={sectionName} content={content} context={context} />;
        }
    };

    static propTypes = {
        'context' : PropTypes.shape({
            "title" : PropTypes.string,
            "content" : PropTypes.any.isRequired,
            "table-of-contents" : PropTypes.object
        }).isRequired,
        'entryRenderFxn' : PropTypes.func
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.entryRenderFxn = typeof this.entryRenderFxn === 'function' ? this.entryRenderFxn.bind(this) : this.props.entryRenderFxn;
    }

    componentDidMount(){
        this.maybeSetRedirectedAlert();
    }

    /**
     * A simpler form (minus AJAX request) of DefaultItemView's similar method.
     */
    maybeSetRedirectedAlert(){
        if (!this.props.href) return;

        var hrefParts = url.parse(this.props.href, true),
            redirected_from = hrefParts.query && hrefParts.query.redirected_from;

        if (redirected_from){
            setTimeout(function(){
                Alerts.queue({
                    'title' : "Redirected",
                    'message': <span>You have been redirected from old page <span className="text-500">{ redirected_from }</span> to <span className="text-500">{ hrefParts.pathname }</span>. Please update your bookmarks.</span>,
                    'style': 'warning'
                });
            }, 0);
        }
    }

    render(){
        var parsedContent;
        try {
            parsedContent = parseSectionsContent(this.props.context);
        } catch (e) {
            console.dir(e);
            parsedContent = _.extend({}, this.props.context, { 'content' : [ { 'content' : '<h4>Error - ' + e.message + '</h4>Check Page content/sections.', 'name' : 'error' } ] });
        }
        var tableOfContents = (parsedContent && parsedContent['table-of-contents'] && parsedContent['table-of-contents'].enabled) ? parsedContent['table-of-contents'] : false;
        return (
            <Wrapper
                key="page-wrapper"
                title={parsedContent.title}
                tableOfContents={tableOfContents}
                context={parsedContent}
                navigate={this.props.navigate}
                href={this.props.href}
                children={StaticPage.renderSections(this.entryRenderFxn, parsedContent)}
            />
        );
    }
}


globals.content_views.register(StaticPage, 'StaticPage');
