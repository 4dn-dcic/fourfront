'use strict';

import React from 'react';
import * as d3 from 'd3';
import _ from 'underscore';
import { Collapse } from 'react-bootstrap';
import * as globals from './../globals';
import { getElementTop, animateScrollTo, getScrollingOuterElement, getPageVerticalScrollPosition } from './../util/layout';
import { isServerSide, console, navigate } from './../util';


class TableEntry extends React.Component {

    static getChildHeaders(content, maxHeaderDepth, currentDepth){
        if (!TableOfContents.isContentJSX(content)) return [];
        return content.props.children.filter((child,i,a) =>
            TableOfContents.isHeaderComponent(child, maxHeaderDepth || 6) && child.props.type === 'h' + (currentDepth + 1)
        );
    }

    static defaultProps = {
        'title' : 'Table of Content Entry',
        'link'  : 'sample-link',
        'style' : 'normal',
        'className' : null,
        'offsetBeforeTarget' : 72,
        'pageScrollTop' : 0,
        'depth' : null,
        'listStyleTypes' : null,
        'mounted' : null,
        'content' : null,
        'nextHeader' : null
    }

    constructor(props){
        super(props);
        this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.getTargetElement = this.getTargetElement.bind(this);
        this.getNextHeaderElement = this.getNextHeaderElement.bind(this);
        this.handleClick = _.throttle(this.handleClick.bind(this), 300);
        this.determineIfActive = this.determineIfActive.bind(this);
        this.render = this.render.bind(this);

        this.targetElement = null; // Header element we scroll to is cached here. Not in state as does not change.
        if (props.collapsible){
            this.state = { 'open' : false };
        }
    }

    shouldComponentUpdate(nextProps, nextState){
        if (
            nextProps.mounted !== this.props.mounted ||
            nextProps.pageScrollTop !== this.props.pageScrollTop ||
            nextState.open !== this.state.open
            //this.determineIfActive(nextProps) !== this.determineIfActive(this.props)
        ){
            return true;
        }
        return false;
    }

    getTargetElement(link = this.props.link){
        if (typeof document === 'undefined' || !document || !window) return null; // Not clientside.
        if (!this.targetElement){
            // Cache it for performance. Doesn't needa be in state as won't change.
            this.targetElement = d3.select('[id="' + link + '"]').node();
        }
        return this.targetElement;
    }

    getNextHeaderElement(props = this.props){
        if (!props.nextHeader || typeof document === 'undefined' || !document || !window) return null; // Not clientside or no header.
        var id = null;
        if (props.nextHeader === 'bottom'){
            id = 'page-footer';
        } else if (typeof props.nextHeader === 'string') {
            id = props.nextHeader;
        } else if (TableOfContents.isContentJSX(props.nextHeader)) {
            id = props.nextHeader.type.prototype.getID.call(props.nextHeader);
        }
        if (!id) return null;
        return d3.select('[id="' + id + '"]').node() || null;
    }

    handleClick(){

        var pageScrollTop, elementTop;
        if (this.props.link === "top") {
            elementTop = 0;
        } else if (typeof this.props.link === 'string'){
            elementTop = getElementTop(this.getTargetElement());
        } else {
            return null;
        }

        pageScrollTop = getPageVerticalScrollPosition();

        animateScrollTo(elementTop, 750, this.props.offsetBeforeTarget, ()=>{
            if (typeof this.props.navigate === 'function'){
                var link = this.props.link;
                setTimeout(()=>{
                    if (link === 'top' || link === 'bottom') link = '';
                    this.props.navigate('#' + link, { 'replace' : true, 'skipRequest' : true });
                }, link === 'top' || (typeof pageScrollTop === 'number' && pageScrollTop <= 40) ? 800 : 0);
            }
        });

        return;

    }

    determineIfActive(props = this.props){

        if (!props.mounted) return false;

        var scrollingOuterElement, targetElem, elemTop;
        scrollingOuterElement = getScrollingOuterElement();


        if (props.depth === 0 && props.mounted){
            elemTop = 0;
        } else {
            targetElem = this.getTargetElement(props.link);
            elemTop = getElementTop(targetElem);
            if (props.mounted && scrollingOuterElement && scrollingOuterElement.scrollHeight && window && window.innerHeight){
                // Try to prevent from trying to scroll past max scrollable height.
                elemTop = Math.min(scrollingOuterElement.scrollHeight - window.innerHeight, elemTop);
            }
        }

        if (typeof elemTop !== 'number') return null;

        if (props.nextHeader) {
            var nextHeaderTop = null;
            if (typeof props.nextHeader === 'number'){
                nextHeaderTop = props.nextHeader;
            } else {
                var nextHeaderElement = this.getNextHeaderElement(props);
                if (nextHeaderElement) nextHeaderTop = getElementTop(nextHeaderElement);
            }
            
            if (
                nextHeaderTop &&
                props.pageScrollTop >= (elemTop      - props.offsetBeforeTarget - 150) &&
                props.pageScrollTop < (nextHeaderTop - props.offsetBeforeTarget - 150)
            ) return true;
            else return false;
            
        } else if (targetElem && targetElem.className.split(' ').indexOf('static-section-entry') > -1) {
            var elemStyle = (targetElem.computedStyle || window.getComputedStyle(targetElem));
            if (
                props.pageScrollTop >= (elemTop - props.offsetBeforeTarget - 150) &&
                props.pageScrollTop <  (
                    elemTop + 
                    parseInt(elemStyle.marginTop) +
                    targetElem.offsetHeight - 
                    props.offsetBeforeTarget - 150
                )
            ) return true;
            else return false;
        } else if (props.depth === 0){

            if (
                props.mounted &&
                props.pageScrollTop >= 0 && props.pageScrollTop < 40
            ) return true;
        }
        return false;

    }

    render(){
        var title = this.props.title;
        var subtitle = null;
        var active = this.determineIfActive();

        if (this.props.depth === 0){
            subtitle = title;
            title = "Top of Page";
        }

        var childHeaders = TableEntry.getChildHeaders(this.props.content, this.props.maxHeaderDepth, this.props.depth);
   
        var collapsibleButton;
        if (this.props.collapsible && childHeaders.length > 0){
            collapsibleButton = <i
                className={"inline-block icon icon-fw icon-" + (this.state.open ? 'minus' : 'plus')}
                onClick={(e)=> {
                    this.setState({ open : !this.state.open });
                }}
            />;
        }

        if (typeof this.props.link === 'string' && this.props.link.length > 0){
            title = (
                <div className="title-link-wrapper">
                    { collapsibleButton }
                    <a href={'#' + this.props.link} onClick={(e)=>{ 
                        e.preventDefault(); 
                        //e.target.blur();
                        this.handleClick();
                    }}>
                        { title }
                    </a>
                </div>
            );
        }

        if (this.props.depth === 0){
            title = (
                <span title={subtitle} className="top-of-page visible-lg-block visible-lg">
                    <i className="icon icon-long-arrow-up"></i>
                    { title }
                </span>
            );
        }

        return (
            <li className={
                "table-content-entry" + 
                (this.props.className ? ' ' + this.props.className : '') +
                (this.props.depth === 0 ? ' top' : '') +
                (active ? ' active' : '')
            } data-depth={this.props.depth} ref="listItem">
                { title }
                
                <Collapse in={this.state === null || this.state.open === true} transitionAppear>
                    <div>
                        <TableEntryChildren
                            active={active}
                            content={this.props.content}
                            childHeaders={childHeaders}
                            depth={this.props.depth}
                            mounted={this.props.mounted}
                            listStyleTypes={this.props.listStyleTypes}
                            pageScrollTop={this.props.pageScrollTop}
                            nextHeader={this.props.nextHeader}
                            children={this.props.children}
                            navigate={this.props.navigate}
                            link={this.props.link}
                            maxHeaderDepth={this.props.maxHeaderDepth}
                            parentClosed={this.state && !this.state.open}
                            skipDepth={this.props.skipDepth}
                        />
                    </div>
                </Collapse>

            </li>
        );
    }

}


class TableEntryChildren extends React.Component {

    static getHeadersFromContent(jsxContent, maxHeaderDepth, currentDepth){
        if (!TableOfContents.isContentJSX(jsxContent)) return [];
        return jsxContent.props.children.filter((child,i,a) =>
            TableOfContents.isHeaderComponent(child, maxHeaderDepth || 6) && child.props.type === 'h' + (currentDepth + 1)
        );
    }

    static getSubsequentChildHeaders(header, jsxContent, maxHeaderDepth, currentDepth){
        if (!TableOfContents.isContentJSX(jsxContent)) return null;

        var getNext = null;
        var nextMajorHeader = null;
        var nextHeaderComponents = _.reduce(jsxContent.props.children, (m, child)=>{
            if (getNext === null && child === header){
                getNext = true;
                return m;
            }
            if (getNext && TableOfContents.isHeaderComponent(child, maxHeaderDepth || 6)){
                if (
                    child.props.type === 'h' + Math.max(currentDepth + 1, 1) ||
                    child.props.type === 'h' + Math.max(currentDepth    , 1) ||
                    child.props.type === 'h' + Math.max(currentDepth - 1, 1) ||
                    child.props.type === 'h' + Math.max(currentDepth - 2, 1)
                ){
                    nextMajorHeader = child;
                    getNext = false;
                } else {
                    m.push(child);
                }
            }
            return m;
        }, /* m = */ []);

        return { 
            'content' : React.cloneElement(jsxContent, {}, nextHeaderComponents),
            'nextMajorHeader' : nextMajorHeader
        };
    }

    static renderChildrenElements(childHeaders, jsxContent, maxHeaderDepth, currentDepth, listStyleTypes, pageScrollTop, mounted, skipDepth = 0, nextHeader = null){
        if (childHeaders && childHeaders.length){
            return childHeaders.map((h, index) =>{

                var childContent = TableEntryChildren.getSubsequentChildHeaders(h, jsxContent, maxHeaderDepth, currentDepth);                
                
                if (currentDepth + 1 > 0 && skipDepth >= currentDepth + 1){
                    return TableEntryChildren.renderChildrenElements(
                        childHeaders, childContent.content, maxHeaderDepth, currentDepth + 1,
                        listStyleTypes, pageScrollTop, mounted, skipDepth, childContent.nextMajorHeader || nextHeader || null
                    );
                }


                var hString = TableOfContents.textFromReactChildren(h.props.children);
                var link = TableOfContents.slugify(hString);
                var collapsible = currentDepth >= (1 + (skipDepth || 0));
                return (
                    <TableEntry 
                        link={link}
                        title={hString}
                        key={link}
                        depth={(currentDepth || 0) + 1}
                        listStyleTypes={listStyleTypes}
                        pageScrollTop={pageScrollTop}
                        mounted={mounted}
                        content={childContent.content}
                        nextHeader={childContent.nextMajorHeader || nextHeader || null}
                        navigate={navigate}
                        maxHeaderDepth={maxHeaderDepth}
                        collapsible={collapsible}
                        skipDepth={skipDepth}
                    />
                );
            });
        }
        return null;
    }

    constructor(props){
        super(props);
        this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.getHeadersFromContent = this.getHeadersFromContent.bind(this);
        this.children = this.children.bind(this);
        this.render = this.render.bind(this);
    }

    shouldComponentUpdate(nextProps){
        if (nextProps.active) return true;
        if (nextProps.depth === 0) return true;
        if (nextProps.mounted !== this.props.mounted) return true;
        if (nextProps.active !== this.props.active) return true;
        if (nextProps.parentClosed !== this.props.parentClosed) return true;
        return false;
    }

    getHeadersFromContent(){
        return TableEntryChildren.getHeadersFromContent(this.props.content, this.props.maxHeaderDepth, this.props.depth);
    }

    children(){
        var childHeaders = this.getHeadersFromContent();
        if (childHeaders && childHeaders.length){
            return TableEntryChildren.renderChildrenElements(
                childHeaders, this.props.content, this.props.maxHeaderDepth,
                this.props.depth, this.props.listStyleTypes, this.props.pageScrollTop,
                this.props.mounted, this.props.skipDepth, this.props.nextHeader
            );
        } else {
            return this.props.children;
        }
    }

    render(){
        // Removed: 'collapse' children if not over them (re: negative feedback)
        //if (this.props.depth >= 3 && !this.props.active) return null;
        var children = this.children();
        if (!children) return null;
        return (
            <ol className="inner" style={{ listStyleType : this.props.listStyleTypes[(this.props.depth || 0) + 1] }}>
                { children }
            </ol>
        );
    }
}


export default class TableOfContents extends React.Component {

    /** Taken from https://gist.github.com/mathewbyrne/1280286 */
    static slugify(text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text
    }

    static slugifyReactChildren(children){ return TableOfContents.slugify(TableOfContents.textFromReactChildren(children)); }

    static textFromReactChildren(children){
        if (typeof children === 'string') return children;
        if (Array.isArray(children)){
            return children.filter(function(c){ return typeof c === 'string'; }).join('');
        }
    }

    static isHeaderComponent(c, maxHeaderDepth = 6){
        return (
            c && c.props &&
            typeof c.props.type === 'string' &&
            c.props.type.charAt(0).toLowerCase() === 'h' &&
            _.range(1, maxHeaderDepth + 1).indexOf(parseInt(c.props.type.charAt(1))) > -1
        );
    }

    static isContentJSX(content){ return content && content.__proto__ && content.__proto__.isPrototypeOf(React.Component.prototype); }

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
        'populateAnchors' : true,
        'title' : "Contents",
        'pageTitle' : 'Introduction',
        'includeTop' : false,
        'listStyleTypes' : ['none','decimal', 'lower-alpha', 'lower-roman'],
        'maxHeaderDepth' : 3
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.onPageScroll = _.throttle(this.onPageScroll.bind(this), 100, { 'leading' : false });
        this.onResize = _.debounce(this.onResize.bind(this), 300);
        this.state = {
            'scrollTop' : 0,
            'mounted' : false
        };
    }

    componentDidMount(e){
        if (window && !isServerSide()){
            this.setState(
                { 'mounted' : true, 'scrollTop' : parseInt(getPageVerticalScrollPosition()) },
                () => { 
                    window.addEventListener('scroll', this.onPageScroll);
                    window.addEventListener('resize', this.onResize);
                }
            );
        }
    }

    shouldComponentUpdate(nextProps,nextState){
        if (nextState.mounted !== this.state.mounted) return true;
        if (nextState.scrollTop !== this.state.scrollTop) return true;
        return false;
    }

    componentWillUnmount(){
        // Cleanup
        window.removeEventListener('scroll', this.onPageScroll);
        window.removeEventListener('resize', this.onResize);
    }

    onPageScroll(e){
        setTimeout(()=>{
            this.setState({ 'scrollTop' : parseInt(getPageVerticalScrollPosition()) });
        }, 0);
    }

    onResize(e){
        setTimeout(()=>{
            this.setState({ 'scrollTop' : parseInt(getPageVerticalScrollPosition()) });
        }, 0);
    }

    render(){

        var listStyleTypes = this.props.listStyleTypes.slice(0);

        function sectionEntries(){
            var lastSection = null;
            return _(this.props.context.content).chain()
                .pairs()
                .map(function(entryPair){
                    return _.extend(entryPair[1], { 'link' : entryPair[0] });
                })
                .sortBy(function(s){
                    return s.order || 0;
                })
                .filter((s)=>{
                    if (this.props.skipDepth && this.props.skipDepth > 0) return true;
                    if (typeof s.title === 'string' || typeof s['toc-title'] === 'string'){
                        //if (lastSections.length) lastSections.forEach(function(ls){
                        //    ls.nextHeader = s.link;
                        //});
                        if (lastSection) lastSection.nextHeader = s.link;
                        //lastSections.push(s);
                        lastSection = s;
                        return true;
                    }
                    return false;
                })
                .map((s,i,all) => {
                    if (this.props.skipDepth && this.props.skipDepth > 0) {
                        
                        var childHeaders = TableEntryChildren.getHeadersFromContent(s.content, this.props.maxHeaderDepth, 1);
                        return TableEntryChildren.renderChildrenElements(
                            childHeaders, s.content, this.props.maxHeaderDepth, 1,
                            listStyleTypes, this.state.scrollTop, this.state.mounted, this.props.skipDepth, s.nextHeader || (i === all.length - 1 ? 'bottom' : all[i + 1].link || null  )
                        );
                    }
                    return (<TableEntry 
                        link={s.link}
                        title={s['toc-title'] || s.title}
                        key={s.link}
                        depth={1}
                        content={s.content}
                        listStyleTypes={listStyleTypes}
                        pageScrollTop={this.state.scrollTop}
                        mounted={this.state.mounted}
                        nextHeader={s.nextHeader || (i === all.length - 1 ? 'bottom' : null) }
                        navigate={this.props.navigate}
                        maxHeaderDepth={this.props.maxHeaderDepth}
                        skipDepth={this.props.skipDepth}
                    />);
                })
                .value();
        }

        var content;
        if (this.props.includeTop) {
            var children = sectionEntries.call(this);
            content = (
                <TableEntry 
                    link="top"
                    title={this.props.pageTitle || null}
                    key="top" 
                    depth={0}
                    listStyleTypes={listStyleTypes}
                    pageScrollTop={this.state.scrollTop}
                    mounted={this.state.mounted}
                    navigate={this.props.navigate}
                    nextHeader={(children[0] && children[0].props && children[0].props.link) || null}
                    maxHeaderDepth={this.props.maxHeaderDepth}
                    skipDepth={this.props.skipDepth}
                >
                    { children }
                </TableEntry>
            );
        } else {
            content = sectionEntries.call(this);
        }

        var marginTop = 0; // Account for test warning
        if (this.state.mounted && !isServerSide()){
            if (typeof this.state.scrollTop === 'number' && this.state.scrollTop < 80){
                var testWarningElem = document.getElementsByClassName('navbar-container test-warning-visible');
                marginTop = (testWarningElem[0] && testWarningElem[0].offsetHeight) || marginTop;
            }
        }


        return (
            <div className="table-of-contents" ref="container" style={{
                width : this.state.mounted ?
                        window.innerWidth > 1200 ? this.props.fixedWidth || 'inherit' 
                        :'inherit'
                    : this.props.fixedWidth,
                height:
                    (this.state.mounted && typeof window !== 'undefined' && typeof window.innerHeight === 'number' ?
                        window.innerWidth > 1200 ?
                            ( this.props.maxHeight ||
                              this.state.scrollTop >= 40 ? window.innerHeight - 70 : window.innerHeight - 115 ) :
                            null
                    : 1000),
                marginTop : marginTop
            }}>
                <h4 className="toc-title">{ this.props.title }</h4>
                <ol className="inner" style={{ 
                    listStyleType : listStyleTypes[this.props.includeTop ? 0 : 1],
                    paddingLeft : !Array.isArray(content) ? 0 : null
                }}>
                    { content }
                </ol>
            </div>
        );
    }

}
