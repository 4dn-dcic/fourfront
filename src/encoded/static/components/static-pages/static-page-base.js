'use strict';

var React = require('react');
var _ = require('underscore');
var Markdown = require('markdown-to-jsx');
var TableOfContents = require('./table-contents');
var globals = require('./../globals');
var { isServerSide, gridContainerWidth } = require('./../objectutils');

/** 
 * These are a set of 'mixin' functions which can be used directly on Static Page components. 
 * Simply reference the component method to the relevant method below in React.createClass(..) 
 */
var StaticPageBase = module.exports = {

    getDefaultProps : function(){
        return {
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
    },

    sortedSections : function(){
        if (!this.props.context || !this.props.context.content) return null;
    },

    renderSections : function(renderMethod, context){
        if (!context || !context.content) return null;
        return _(context.content).chain()
            .pairs()
            .sort(function(a,b){
                a = a[1]; b = b[1];
                return a.order - b.order;
            })
            .map(function(contentPair){
                return renderMethod(contentPair[0] /* = key for section */, contentPair[1] /* = content */);
            })
            .value();
    },

    parseSectionsContent : function(context = this.props.context){

        return _.extend(
            {},
            context,
            {
                'content' : _(context.content).chain()
                    .pairs()
                    .map(function(sectionPair){
                        var s = sectionPair[1];
                        if (s.filetype === 'md'){
                            return [sectionPair[0], _.extend(
                                {}, s, {
                                    'content' : Markdown.compiler(s.content, {
                                        'overrides' : _(['h1','h2','h3','h4', 'h5']).chain()
                                            .map(function(type){
                                                return [type, {
                                                    component : StaticPageBase.Entry.Heading,
                                                    props : { 'type' : type }
                                                }];
                                            })
                                            .object()
                                            .value()
                                        })
                                }
                            )];
                        } else {
                            return [sectionPair[0], s];
                        }
                    })
                    .object()
                    .value()
            }
        );
    },

    // TODO: fix ugly hack, wherein I set id in the h3 above actual spot because the usual way of doing anchors cut off entries
    render: {
        simple : function() {
            var context = StaticPageBase.parseSectionsContent(this.props.context);
            return (
                <StaticPageBase.Wrapper title={context.title}>
                    { StaticPageBase.renderSections(this.entryRenderFxn, context) }
                </StaticPageBase.Wrapper>
            );
        },

        withTableOfContents : function(){
            
            var context = StaticPageBase.parseSectionsContent(this.props.context);
            return (
                <StaticPageBase.Wrapper
                    title={context.title}
                    tableOfContents={true}
                    context={context}
                    navigate={this.props.navigate}
                    href={this.props.href}
                >
                    { StaticPageBase.renderSections(this.entryRenderFxn, context) }
                </StaticPageBase.Wrapper>
            );
        },
    },

    Wrapper : React.createClass({

        getDefaultProps : function(){
            return {
                'contentColSize' : 9,
                'tableOfContents' : false
            };
        },

        render : function(){
            
            var title = this.props.title || (this.props.context && this.props.context.title) || null;
            var contentColSize = Math.max(6, this.props.contentColSize); // Min 6.
            contentColSize = Math.min(this.props.tableOfContents ? 9 : 12, contentColSize);
            var mainColClassName = "col-xs-12 col-sm-12 col-lg-" + contentColSize;

            return (
                <div className="static-page row">
                    <div className={mainColClassName}>
                        <h1 className="page-title">{ title }</h1>
                    </div>
                    { this.props.tableOfContents ?
                        <div className={'pull-right col-xs-12 col-sm-12 col-lg-' + (12 - contentColSize)}>
                            <TableOfContents context={this.props.context} pageTitle={title} fixedWidth={
                                (1140 * ((12 - contentColSize) / 12))
                            } navigate={this.props.navigate} href={this.props.href} />
                        </div>
                    : null }
                    <div className={mainColClassName}>
                        { this.props.children }
                    </div>
                </div>
            );
        }
    }),

    Entry : {

        Heading : React.createClass({
            getDefaultProps : function(){
                return {
                    'type' : 'h1',
                    'id' : null
                };
            },
            getID : function(set = false){
                if (typeof this.id === 'string') return this.id;
                var id = (this.props && this.props.id) || TableOfContents.slugifyReactChildren(this.props.children);
                if (set){
                    this.id = id;
                }
                return id;
            },
            componentWillUnmount : function(){ delete this.id; },
            render : function(){
                return React.createElement(
                    this.props.type, 
                    {
                        'children' : this.props.children,
                        'id' : this.getID(true),
                        'ref' : 'el'
                    }
                );
            }
        }),

        renderEntryContent : function(baseClassName){
            var content  = (this.props.content && this.props.content.content)  || null;
            var filetype = (this.props.content && this.props.content.filetype) || null;
            if (!content) return null;
            var placeholder = false;
            if (typeof content === 'string' && content.slice(0,12) === 'placeholder:'){
                placeholder = true;
                content = this.replacePlaceholder(content.slice(12).trim().replace(/\s/g,'')); // Remove all whitespace to help reduce any typo errors.
            }

            var className = "fourDN-content" + (baseClassName? ' ' + baseClassName : '');
            if (placeholder || filetype === 'md'){
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

    }

};

var StaticPageExample = React.createClass({

    statics : {

        Entry : React.createClass({

            getDefaultProps : function(){
                return {
                    'section'   : null,
                    'content'   : null,
                    'entryType' : 'help',
                    'className' : null
                };
            },

            replacePlaceholder : function(placeholderString){
                return content;
            },

            renderEntryContent : StaticPageBase.Entry.renderEntryContent,
            render : StaticPageBase.Entry.render
        })

    },

    propTypes : {
        context : React.PropTypes.shape({
            "title" : React.PropTypes.string,
            "content" : React.PropTypes.shape({
                "sectionID1" : React.PropTypes.object,
                "sectionID2" : React.PropTypes.object,
                "sectionID3" : React.PropTypes.object,
                "sectionIDFour" : React.PropTypes.object
            }).isRequired
        }).isRequired
    },

    entryRenderFxn : function(key, content){
        return <StaticPageExample.Entry key={key} section={key} content={content} />;
    },

    /** Use common funcs for rendering body. Create own for more custom behavior/layouts, using these funcs as base. */
    getDefaultProps : StaticPageBase.getDefaultProps,
    renderSections  : StaticPageBase.renderSections,
    render          : StaticPageBase.render.simple
});

globals.content_views.register(StaticPageExample, 'StaticPage');