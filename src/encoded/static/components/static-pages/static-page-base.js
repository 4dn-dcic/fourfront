'use strict';

var React = require('react');
var _ = require('underscore');
var marked = require('marked');

/** 
 * These are a set of 'mixin' functions which can be used directly on Static Page components. 
 * Simply reference the component method to the relevant method below in React.createClass(..) 
 */
var StaticPageMethods = module.exports = {

    getDefaultProps : function(){
        return {
            "context" : {
                "title" : "Page Title",
                "content" : {
                    "sectionNameID" : {
                        "order"     : 0,
                        "title"     : "Section Title",
                        "content"   : "<h2>Hello World</h2>",
                        "filetype"  : "html"
                    }
                }
            }
        }
    },

    renderSections : function(renderMethod){
        if (!this.props.context || !this.props.context.content) return null;
        var _this = this;
        return _(this.props.context.content).chain()
            .pairs()
            .sort(function(a,b){
                a = a[1]; b = b[1];
                return a.order - b.order;
            })
            .map(function(contentPair){
                var content = contentPair[1];
                if (content.filetype.toLowerCase() === 'md') content = StaticPageMethods.parseMarkdownContent(content);
                return renderMethod(contentPair[0] /* = key for section */, content);
            })
            .value();
    },

    parseMarkdownContent : function(content){
        content.content = marked(content.content, {
            gfm : true,
            tables : true,
            breaks : true
        });
        return content;
        //return marked(content);
    },

    // TODO: fix ugly hack, wherein I set id in the h3 above actual spot because the usual way of doing anchors cut off entries
    render: function() {
        var c = this.props.context.content;
        return(
            <div className="static-page">
                <h1 className="page-title">{ this.props.context.title || 'Home' }</h1>
                { this.renderSections(this.entryRenderFxn)}
            </div>
        );
    },

    Entry : {

        renderEntryContent : function(baseClassName){
            var content = (this.props.content && this.props.content.content) || null;
            if (!content) return null;
            var placeholder = false;
            if (content.slice(0,12) === 'placeholder:'){
                placeholder = true;
                content = this.replacePlaceholder(content.slice(12).trim());
            }

            var className = "fourDN-content" + (baseClassName? ' ' + baseClassName : '');
            if (placeholder){
                return <div className={className}>{ content }</div>;
            } else {
                return <div className={className} dangerouslySetInnerHTML={{__html: content }}></div>;
            }
        },

        render : function(){
            var c = this.props.content;
            
            return (
                <div className={this.props.entryType + "-entry"}>
                    { c && c.title ? 
                        <h2 id={this.props.section} className="fourDN-header">{ c.title }</h2>
                    : null }
                    { this.renderEntryContent(this.props.className) }
                </div>
            );
        }

    }

};