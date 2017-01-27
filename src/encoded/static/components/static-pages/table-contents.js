'use strict';

var React = require('react');
var d3 = require('d3');
var _ = require('underscore');
var globals = require('./../globals');

var TableOfContents = module.exports = React.createClass({

    statics : {
        TableEntry : React.createClass({

            getDefaultProps : function(){
                return {
                    'title' : 'Table of Content Entry',
                    'link'  : 'sample-link',
                    'style' : 'normal',
                    'className' : null,
                    'offsetBeforeTarget' : 72,
                    'pageScrollTop' : 0
                };
            },

            getTargetElement : function(){
                if (typeof document === 'undefined' || !document || !window) return null; // Not clientside.
                if (typeof this.targetElement === 'undefined' || !this.targetElement){
                    // Cache it for performance. Doesn't needa be in state as won't change.
                    this.targetElement = d3.select('[id="' + this.props.link + '"]').node();
                }
                return this.targetElement;
            },

            handleClick : _.throttle(function(){
                var elementTop;
                if (this.props.link === "top") {
                    elementTop = 0;
                } else if (typeof this.props.link === 'string'){
                    elementTop = TableOfContents.getElementTop(this.getTargetElement());
                } else {
                    return null;
                }

                if (elementTop === null || !document || !document.body) return null;
                elementTop = Math.max(0, elementTop - this.props.offsetBeforeTarget); // - offset re: nav bar header.
                if (document && document.body && document.body.scrollHeight && window && window.innerHeight){
                    // Try to prevent from trying to scroll past max scrollable height.
                    elementTop = Math.min(document.body.scrollHeight - window.innerHeight, elementTop);
                }

                function scrollTopTween(scrollTop){
                    return function(){
                        var interpolate = d3.interpolateNumber(this.scrollTop, scrollTop);
                        return function(t){ document.body.scrollTop = interpolate(t) };
                    }
                }

                d3.select(document.body)
                    .interrupt()
                    .transition()
                    .duration(750)
                    .tween("bodyScroll", scrollTopTween(elementTop));

            }, 200),

            render : function(){
                var title = this.props.title;
                var subtitle = null;
                var active = false; // Whether currently scrolled over this section
                var targetElem;

                if (this.props.depth === 0){
                    subtitle = title;
                    title = "Top of Page";
                    targetElem = (typeof document !== 'undefined' && document && document.body) || null;
                } else {
                    targetElem = this.getTargetElement();
                }

                if (targetElem){
                    
                    if (this.props.depth === 0){
                        if (
                            this.props.mounted &&
                            this.props.pageScrollTop >= 0 && this.props.pageScrollTop < 30
                        ) active = true;
                    } else if (targetElem.className === 'fourDN-header') {
                        var elemTop = TableOfContents.getElementTop(targetElem.parentElement);
                        var elemStyle = (targetElem.parentElement.computedStyle || window.getComputedStyle(targetElem.parentElement));
                        if (
                            this.props.pageScrollTop >= (elemTop - this.props.offsetBeforeTarget - 5) &&
                            this.props.pageScrollTop <  (
                                elemTop + 
                                parseInt(elemStyle.marginTop) +
                                targetElem.parentElement.offsetHeight - 
                                this.props.offsetBeforeTarget - 5
                            )
                        ) active = true;
                        console.log(elemTop, elemStyle.marginTop, elemStyle.marginBottom);
                    }

                    console.log(
                        this.props.mounted,
                        //elemTop,
                        this.props.pageScrollTop,
                        targetElem.scrollHeight,
                        targetElem.offsetHeight,
                        active,
                        title
                    );
                }

                

                if (typeof this.props.link === 'string' && this.props.link.length > 0){
                    title = (
                        <a href={'#' + this.props.link} onClick={(e)=>{ 
                            e.preventDefault(); 
                            e.target.blur();
                            this.handleClick();
                        }}>
                            { title }
                        </a>
                    );
                }

                if (this.props.depth === 0){
                    title = (
                        <span title={subtitle} className="top-of-page">
                            <i className="icon icon-long-arrow-up"></i>
                            { title } <small>{ subtitle }</small>
                        </span>
                    );
                }

                return (
                    <li className={
                        "table-content-entry" + 
                        (this.props.className ? ' ' + this.props.className : '') +
                        (this.props.depth === 0 ? ' top' : '') +
                        (active ? ' active' : '')
                    } data-depth={this.props.depth}>
                        { title }
                        { this.props.children ? 
                            <ol className="inner" style={{ listStyleType : this.props.listStyleTypes[(this.props.depth || 0) + 1] }}>
                                { this.props.children }
                            </ol>
                        : null }
                    </li>
                );
            }
        }),

        getElementTop : function(el){
            if (!(typeof window !== 'undefined' && window && document && document.body)) return null;
            if (!el || typeof el.getBoundingClientRect !== 'function') return null;
            var bodyRect = document.body.getBoundingClientRect();
            var boundingRect = el.getBoundingClientRect();
            return boundingRect.top - bodyRect.top;
        }
    },

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
            },
            'populateAnchors' : true,
            'title' : "Table of Contents",
            'pageTitle' : 'Introduction',
            'listStyleTypes' : ['none','upper-roman']
        };
    },

    getInitialState : function(){
        return { 'scrollTop' : 0, 'mounted' : false };
    },

    onPageScroll : _.throttle(function(e){
        setTimeout(()=>{
            this.setState({ 'scrollTop' : parseInt(document.body.scrollTop) });
        }, 0);
    }, 300, { leading: false }),

    componentDidMount : function(e){
        if (window && document && document.body){
            window.addEventListener('scroll', this.onPageScroll)
            this.setState({ 'mounted' : true, 'scrollTop' : parseInt(document.body.scrollTop) });
        }
    },

    shouldComponentUpdate : function(pastProps, pastState){
        if (pastState && this.state && (pastState.scrollTop === this.state.scrollTop)){
            return false;
        }
        return true;
    },

    render : function(){

        var listStyleTypes = this.props.listStyleTypes.slice(0);

        function sectionEntries(){
            return _(this.props.context.content).chain()
                .pairs()
                .map(function(entryPair){
                    return _.extend(entryPair[1], { 'link' : entryPair[0] });
                })
                .filter(function(s){
                    if (typeof s.title === 'string' || typeof s['toc-title'] === 'string') return true;
                    return false;
                })
                .sortBy('order')
                .map((s) => 
                    <TableOfContents.TableEntry 
                        link={s.link}
                        title={s['toc-title'] || s.title}
                        key={s.link}
                        depth={1}
                        listStyleTypes={listStyleTypes}
                        pageScrollTop={this.state.scrollTop}
                        mounted={this.state.mounted}
                    />)
                .value();
        }

        var content;
        if (this.props.pageTitle) {
            content = (
                <TableOfContents.TableEntry 
                    link="top"
                    title={this.props.pageTitle}
                    key="top" 
                    depth={0}
                    listStyleTypes={listStyleTypes}
                    pageScrollTop={this.state.scrollTop}
                    mounted={this.state.mounted}
                >
                    { sectionEntries.call(this) }
                </TableOfContents.TableEntry>
            );
        } else {
            content = sectionEntries.call(this);
        }

        return (
            <div className="table-of-contents" ref="container" style={{
                width : this.props.width || 'inherit'
            }}>
                <h4 className="toc-title">{ this.props.title }</h4>
                <ol className="inner" style={{ 
                    listStyleType : listStyleTypes[0],
                    paddingLeft : !Array.isArray(content) ? 0 : null
                }}>
                    { content }
                </ol>
            </div>
        );
    }

});