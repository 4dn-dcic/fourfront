'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { compiler } from 'markdown-to-jsx';
import TableOfContents from './table-contents';
import { CSVMatrixView } from './components';
import * as globals from './../globals';
import { layout, console } from './../util';

/**
 * These are a set of 'mixin' functions which can be used directly on Static Page components.
 * Simply reference the component method to the relevant method below in React.createClass(..)
 */
export const defaultProps = {
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
    }
};


export function getDefaultProps(){
    return _.clone(defaultProps);
}


export function sortedSections(){
    if (!this.props.context || !this.props.context.content) return null;
}


export function renderSections(renderMethod, context){
    if (!context || !context.content) return null;
    return _(context.content).chain()
        .pairs()
        .sort(function(a,b){
            a = a[1]; b = b[1];
            return a.order - b.order;
        })
        .map(function(contentPair){
            return renderMethod(
                contentPair[0] /* = key for section */,
                contentPair[1] /* = content */,
                context /* = full content */
            );
        })
        .value();
}


export function parseSectionsContent(context = this.props.context){

    return _.extend({}, context, {
        'content' : _(context.content).chain().pairs().map(function(sectionPair){ // [key, value] pairs
            var s = sectionPair[1];
            if (s.filetype === 'md'){
                var content = compiler(s.content, {
                    'overrides' : _(['h1','h2','h3','h4', 'h5']).chain()
                        .map(function(type){
                            return [type, {
                                component : Entry.Heading,
                                props : { 'type' : type }
                            }];
                        })
                        .object()
                        .value()
                });
                s =  _.extend({}, s, { 'content' : content });
            }
            return [sectionPair[0], s];
        }).object().value()
    });
}



/**
 * Converts links to other files into links to sections from a React element and its children.
 * 
 * @param {Element} content - A high-level React element representation of some content which might have relative links.
 * 
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
                if (typeof context.content[filenameWithoutExtension] !== 'undefined'){
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
        } else {
            return elem;
        }
        
    } else if (elem.props.children && typeof elem.type === 'string') {
        return React.cloneElement(
            elem,
            _.omit(elem.props, 'children'),
            React.Children.map(elem.props.children, function(child){
                return correctRelativeLinks(child, context, depth + 1);
            })
        );
    } else {
        return elem;
    }
}



export const render = {

    base : function(){
        var context = parseSectionsContent(this.props.context);
        return (
            <Wrapper
                title={context.title}
                tableOfContents={typeof context.toc === 'undefined' || context.toc.enabled === false ? false : true}
                context={context}
                navigate={this.props.navigate}
                href={this.props.href}
            >
                { renderSections(this.entryRenderFxn, context) }
            </Wrapper>
        );
    },

    simple : function() {
        var context = parseSectionsContent(this.props.context);
        return (
            <Wrapper title={context.title}>
                { renderSections(this.entryRenderFxn, context) }
            </Wrapper>
        );
    },

    withTableOfContents : function(){

        var context = parseSectionsContent(this.props.context);
        return (
            <Wrapper
                title={context.title}
                tableOfContents={true}
                context={context}
                navigate={this.props.navigate}
                href={this.props.href}
            >
                { renderSections(this.entryRenderFxn, context) }
            </Wrapper>
        );
    },
};



export class Wrapper extends React.Component {

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
        var toc = context.toc || typeof this.props.tableOfContents === 'object' ? this.props.tableOfContents : {};
        var title = this.props.title || (context && context.title) || null;
        return (
            <div className={'pull-right col-xs-12 col-sm-12 col-lg-' + (12 - contentColSize)}>
                <TableOfContents
                    context={context}
                    pageTitle={title}
                    fixedWidth={(1140 * ((12 - contentColSize) / 12))}
                    navigate={this.props.navigate}
                    href={this.props.href}
                    skipDepth={toc && context.toc['skip-depth'] || 0}
                    maxHeaderDepth={toc && context.toc['header-depth'] || 6}
                    includeTop={toc && context.toc['include-top-link']}
                    listStyleTypes={['none'].concat((toc && context.toc['list-styles']) || this.props.tocListStyles)}
                />
            </div>
        );
    }

    render(){

        var title = this.props.title || (this.props.context && this.props.context.title) || null;
        var contentColSize = this.contentColSize();
        var mainColClassName = "col-xs-12 col-sm-12 col-lg-" + contentColSize;

        return (
            <div className="static-page row">
                { this.renderToC() }
                <div className={mainColClassName}>
                    { this.props.children }
                </div>
            </div>
        );
    }
}


export const Entry = {

    Heading : class Heading extends React.Component {

        static defaultProps = {
            'type' : 'h1',
            'id' : null
        }

        constructor(props){
            super(props);
            this.getID = this.getID.bind(this);
            this.render = this.render.bind(this);
        }

        getID(set = false){
            if (typeof this.id === 'string') return this.id;
            var id = (this.props && this.props.id) || TableOfContents.slugifyReactChildren(this.props.children);
            if (set){
                this.id = id;
            }
            return id;
        }

        componentWillUnmount(){ delete this.id; }

        render(){
            return React.createElement(
                this.props.type,
                {
                    'children' : this.props.children,
                    'id' : this.getID(true),
                    'ref' : 'el'
                }
            );
        }
    },

    renderEntryContent : function(baseClassName){
        var content  = (this.props.content && this.props.content.content)  || null;
        if (!content) return null;

        var filetype = this.props.content.filetype || null;
        var placeholder = false;

        if (typeof content === 'string' && content.slice(0,12) === 'placeholder:'){
            placeholder = true;
            content = this.replacePlaceholder(content.slice(12).trim().replace(/\s/g,'')); // Remove all whitespace to help reduce any typo errors.
        }

        var className = "fourDN-content" + (baseClassName? ' ' + baseClassName : '');
        if (filetype === 'csv'){
            return <CSVMatrixView csv={content} options={this.props.content.options} />;
        } else if (placeholder || filetype === 'md'){
            content = correctRelativeLinks(content, this.props.context);
            //console.log(this.props.section, content, this.props.context);
            return <div className={className}>{ content }</div>;
        } else {
            return <div className={className} dangerouslySetInnerHTML={{__html: content }}></div>;
        }
    },

    render : function(){
        var c = this.props.content;

        return (
            <div className={this.props.entryType + "-entry static-section-entry"} id={this.props.section}>
                { c && c.title ?
                    <h2 className="fourDN-header">{ c.title }</h2>
                : null }
                { this.renderEntryContent(this.props.className) }
            </div>
        );
    }

};

class EntryExample extends React.Component {

    static defaultProps = {
        'section'   : null,
        'content'   : null,
        'entryType' : 'help',
        'className' : null
    }

    constructor(props){
        super(props);
        this.renderEntryContent = Entry.renderEntryContent.bind(this);
        this.render = Entry.render.bind(this);
    }

    replacePlaceholder(placeholderString){
        return placeholderString;
    }

}

class StaticPageExample extends React.Component {

    static Entry = EntryExample

    static defaultProps = _.clone(defaultProps);

    static propTypes = {
        context : PropTypes.shape({
            "title" : PropTypes.string,
            "content" : PropTypes.shape({
                "sectionID1" : PropTypes.object,
                "sectionID2" : PropTypes.object,
                "sectionID3" : PropTypes.object,
                "sectionIDFour" : PropTypes.object
            }).isRequired
        }).isRequired
    }

    constructor(props){
        super(props);
        this.renderSections = renderSections.bind(this);
        this.render = render.simple.bind(this);
    }
    
    entryRenderFxn(key, content, context){
        return <EntryExample key={key} section={key} content={content} context={context} />;
    }

}

globals.content_views.register(StaticPageExample, 'StaticPage');
