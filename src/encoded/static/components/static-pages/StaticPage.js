'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { compiler } from 'markdown-to-jsx';
import { Collapse } from 'react-bootstrap';
import Alerts from './../alerts';
import { CSVMatrixView, TableOfContents, MarkdownHeading, HeaderWithLink, BasicUserContentBody } from './components';
import * as globals from './../globals';
import { HiGlassPlainContainer } from './../item-pages/components';
import { layout, console, object, isServerSide } from './../util';
import { replaceString as replacePlaceholderString } from './placeholders';



/**
 * Converts context.content into different format if necessary and returns copy of context with updated 'content'.
 * Currently only converts Markdown content (if a context.content[] item has 'filetype' === 'md'). Others may follow.
 *
 * @param {Object} context - Context provided from back-end, including all properties.
 */
export function parseSectionsContent(context = this.props.context){

    var markdownCompilerOptions = {
        // Override basic header elements with MarkdownHeading to allow it to be picked up by TableOfContents
        'overrides' : _.object(_.map(['h1','h2','h3','h4', 'h5', 'h6'], function(type){
            return [type, {
                'component' : MarkdownHeading,
                'props'     : { 'type' : type }
            }];
        }))
    };

    function parse(section){

        if (Array.isArray(section['@type']) && section['@type'].indexOf('StaticSection') > -1){
            // StaticSection Parsing
            if (section.filetype === 'md' && typeof section.content === 'string'){
                section =  _.extend({}, section, {
                    'content' : compiler(section.content, markdownCompilerOptions)
                });
            } else if (section.filetype === 'html' && typeof section.content === 'string'){
                section =  _.extend({}, section, {
                    'content' : object.htmlToJSX(section.content)
                });
            } // else: retain plaintext or HTML representation
        } else if (Array.isArray(section['@type']) && section['@type'].indexOf('HiglassViewConfig') > -1){
            // HiglassViewConfig Parsing
            if (!section.viewconfig) throw new Error('No viewconfig setup for this section.');
            section =  _.extend({}, section, {
                'content' : <HiGlassPlainContainer viewConfig={section.viewconfig} />
            });
        } else if (Array.isArray(section['@type']) && section['@type'].indexOf('JupyterNotebook') > -1){
            // TODO
        }

        return section;
    }

    if (!Array.isArray(context.content)) throw new Error('context.content is not an array.');

    return _.extend(
        {}, context, {
            'content' : _.map(
                _.filter(context.content || [], function(section){ return section && (section.content || section.viewconfig) && !section.error; }),
                parse
            )
        });
}


/**
 * Converts links to other files into links to sections from a React element and its children (recursively).
 *
 * @param {*} elem                                      A high-level React element representation of some content which might have relative links.
 * @param {{ content: { name: string }}} context        Backend-provided data.
 * @param {number} [depth=0]                            Current depth.
 * @returns {JSX.Element} Copy of original 'elem' param with corrected links.
 */
export function correctRelativeLinks(elem, context, depth=0){
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

        var { context, tableOfContents, href, windowWidth } = this.props,
            contentColSize = this.contentColSize(),
            toc = context['table-of-contents'] || (tableOfContents && typeof tableOfContents === 'object' ? tableOfContents : {}),
            title = this.props.title || (context && context.title) || null;

        return (
            <div key="toc-wrapper" className={'pull-right col-xs-12 col-sm-12 col-lg-' + (12 - contentColSize)}>
                <TableOfContents pageTitle={title} fixedGridWidth={12 - contentColSize}
                    maxHeaderDepth={toc['header-depth'] || 6}
                    {..._.pick(this.props, 'navigate', 'windowWidth', 'context', 'href', 'registerWindowOnScrollHandler')}
                    //skipDepth={1}
                    //includeTop={toc['include-top-link']}
                    //listStyleTypes={['none'].concat((toc && toc['list-styles']) || this.props.tocListStyles)}
                />
            </div>
        );
    }

    render(){

        var title = this.props.title || (this.props.context && this.props.context.title) || null,
            contentColSize = this.contentColSize(),
            mainColClassName = "col-xs-12 col-sm-12 col-lg-" + contentColSize;

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
    };

    constructor(props){
        super(props);
        this.renderEntryContent = this.renderEntryContent.bind(this);
        this.toggleOpen = _.throttle(this.toggleOpen.bind(this), 1000);
        var options = (props.section && props.section.options) || {};
        this.state = {
            'open' : options.default_open,
            'closing' : false
        };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.sectionName === this.props.sectionName) return;
        var options = (nextProps.section && nextProps.section.options) || {};
        this.setState({
            //'isCollapsible' : options.collapsible,
            'open' : options.default_open,
            'closing' : false
        });
    }

    renderEntryContent(baseClassName){
        var { context, section } = this.props,
            content     = (section && section.content) || null,
            options     = (section && section.options) || {},
            filetype    = (section && section.filetype) || null, // Only set on StaticSection; not HiglassViewConfig or other Item types.
            placeholder = false;

        if (!content) return null;

        if (typeof content === 'string' && content.slice(0,12) === 'placeholder:'){
            placeholder = true;
            content = replacePlaceholderString(content.slice(12).trim().replace(/\s/g,'')); // Remove all whitespace to help reduce any typo errors.
        }

        var className = "section-content clearfix " + (baseClassName? ' ' + baseClassName : '');

        if (filetype === 'csv'){
            // Special case
            return <CSVMatrixView csv={content} options={this.props.content.options} />;
        } else {
            // Common case - markdown, plaintext, etc.
            return <div className={className}>{ content }</div>;
        }
    }

    toggleOpen(open, e){
        this.setState(function(currState){
            if (typeof open !== 'boolean'){
                open = !currState.open;
            }
            var closing = !open && currState.open;
            return { open, closing };
        }, ()=>{
            setTimeout(()=>{
                this.setState(function(currState){
                    if (!currState.open && currState.closing){
                        return { 'closing' : false };
                    }
                    return null;
                });
            }, 500);
        });
    }

    render(){
        var { section, entryType, sectionName, className, context } = this.props,
            { open, closing } = this.state,
            id              = TableOfContents.elementIDFromSectionName(sectionName),
            options         = (section && section.options) || {},
            outerClassName  = entryType + "-entry static-section-entry";

        if (options.collapsible){
            outerClassName += ' can-collapse ' + (open ? 'open' : 'closed');
            return (
                <div className={outerClassName} id={id}>
                    { section && section.title ?
                        <HeaderWithLink className={"section-title can-collapse " + (open ? 'open' : 'closed')} link={id} context={context} onClick={this.toggleOpen}>
                            <i className={"icon icon-fw icon-" + (open ? 'minus' : 'plus')}/>&nbsp;&nbsp;
                            { section.title }
                        </HeaderWithLink>
                    : null }
                    <Collapse in={open}>
                        <div className="inner">
                            { (open || closing) ? this.renderEntryContent(className) : null }
                        </div>
                    </Collapse>
                </div>
            );
        }

        return (
            <div className={outerClassName} id={id}>
                { section && section.title ?
                    <HeaderWithLink className="section-title" link={id} context={context}>{ section.title }</HeaderWithLink>
                : null }
                { this.renderEntryContent(className) }
            </div>
        );
    }

}

/**
 * This component shows an alert on mount if have been redirected from a different page, and
 * then renders out a list of StaticEntry components within a Wrapper in its render() method.
 * May be used by extending and then overriding the render() method.
 */
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
        'entryRenderFxn' : function(sectionName, section, context){
            return <StaticEntry key={sectionName} sectionName={sectionName} section={section} context={context} />;
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
                {..._.pick(this.props, 'navigate', 'windowWidth', 'registerWindowOnScrollHandler', 'href')}
                key="page-wrapper" title={parsedContent.title}
                tableOfContents={tableOfContents} context={parsedContent}
                children={StaticPage.renderSections(this.entryRenderFxn, parsedContent)} />
        );
    }
}


globals.content_views.register(StaticPage, 'StaticPage');
