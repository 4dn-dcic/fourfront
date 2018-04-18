'use strict';

import React from 'react';
import * as d3 from 'd3';
import _ from 'underscore';
import { Collapse } from 'react-bootstrap';
import * as globals from './../../globals';
import { getElementTop, animateScrollTo, getScrollingOuterElement, getPageVerticalScrollPosition } from './../../util/layout';
import { isServerSide, console, navigate } from './../../util';


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
        } else if (typeof this.props.link === 'string' && this.props.link){
            if (this.props.link.charAt(0) === '/'){
                (this.props.navigate || navigate)(this.props.link);
                return;
            } else {
                elementTop = getElementTop(this.getTargetElement());
            }
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

        var scrollingOuterElement = getScrollingOuterElement(),
            targetElem,
            elemTop;

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
                props.pageScrollTop >= Math.max(props.depth > 0 ? 40 : 0, elemTop - props.offsetBeforeTarget - 120) &&
                props.pageScrollTop < (nextHeaderTop - props.offsetBeforeTarget - 120)
            ) return true;
            else return false;
        } else if (targetElem && targetElem.className.split(' ').indexOf('static-section-entry') > -1) {
            var elemStyle = (targetElem.computedStyle || window.getComputedStyle(targetElem));
            if (
                props.pageScrollTop >= (elemTop - props.offsetBeforeTarget - 120) &&
                props.pageScrollTop <  (
                    elemTop +
                    parseInt(elemStyle.marginTop) +
                    targetElem.offsetHeight -
                    props.offsetBeforeTarget - 120
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
        var { title, link, content, maxHeaderDepth, depth, collapsible, mounted } = this.props;
        
        var active = this.determineIfActive();

        var childHeaders = TableEntry.getChildHeaders(content, maxHeaderDepth, depth);

        var collapsibleButton;
        if (collapsible && childHeaders.length > 0){
            collapsibleButton = <i
                className={"inline-block icon icon-fw icon-" + (this.state.open ? 'minus' : 'plus')}
                onClick={(e)=> {
                    this.setState({ open : !this.state.open });
                }}
            />;
        }

        if (typeof link === 'string' && link.length > 0){
            title = (
                <div className="title-link-wrapper">
                    { collapsibleButton }
                    <a className={depth === 0 ? 'text-500' : 'text-400'} href={(link.charAt(0) === '/' ? '' : '#') + link} onClick={(e)=>{ e.preventDefault(); this.handleClick(); }}>{ title }</a>
                </div>
            );
        }

        if (depth === 0){
            title = (
                <span title="Up to page listing" className="top-of-page visible-lg-block visible-lg">
                    <i className="icon icon-angle-up"></i>
                    { title }
                </span>
            );
        }

        return (
            <li className={
                "table-content-entry" +
                (this.props.className ? ' ' + this.props.className : '') +
                (depth === 0 ? ' top' : '') +
                (active ? ' active' : '')
            } data-depth={depth} ref="listItem">
                { title }
                <Collapse in={!this.state || this.state.open && mounted}>
                    <div>
                        <TableEntryChildren
                            active={active}
                            content={content}
                            childHeaders={childHeaders}
                            depth={depth}
                            mounted={this.props.mounted}
                            listStyleTypes={this.props.listStyleTypes}
                            pageScrollTop={this.props.pageScrollTop}
                            nextHeader={this.props.nextHeader}
                            children={this.props.children}
                            navigate={this.props.navigate}
                            link={link}
                            maxHeaderDepth={maxHeaderDepth}
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
        let depthToFind = currentDepth;
        let childrenForDepth = [];
        while (depthToFind <= Math.min(maxHeaderDepth, 5) && childrenForDepth.length === 0){
            childrenForDepth = _.filter(jsxContent.props.children, function(child,i,a){
                return TableOfContents.isHeaderComponent(child, maxHeaderDepth || 6) && child.props.type === 'h' + (depthToFind + 1);
            });
            if (childrenForDepth.length === 0){
                depthToFind++;
            }
        }
        return {
            'childDepth' : depthToFind,
            'childHeaders' : childrenForDepth
        };
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

    static renderChildrenElements(childHeaders, currentDepth, jsxContent, opts={ 'skipDepth' : 0, 'nextHeader' : null }){

        var { skipDepth, maxHeaderDepth, listStyleTypes, pageScrollTop, mounted, nextHeader } = opts;

        if (childHeaders && childHeaders.length){
            return childHeaders.map((h, index) =>{

                var childContent = TableEntryChildren.getSubsequentChildHeaders(h, jsxContent, maxHeaderDepth, currentDepth);

                if (skipDepth > currentDepth){
                    return TableEntryChildren.renderChildrenElements(
                        childHeaders, currentDepth + 1, childContent.content, _.extend({}, opts, { 'nextHeader' : childContent.nextMajorHeader || nextHeader || null })
                    );
                }

                var hAttributes = MarkdownHeading.getAttributes(h.props.children);
                var hString = TableOfContents.textFromReactChildren(h.props.children);
                var link;
                if (hAttributes && hAttributes.matchedString){
                    hString = hString.replace(hAttributes.matchedString, '').trim();
                    if (hAttributes.id){
                        link = hAttributes.id;
                    }
                }
                if (!link) link = TableOfContents.slugify(hString);
                var collapsible = currentDepth >= 1 + skipDepth;
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
        var { childHeaders, childDepth } = this.getHeadersFromContent();
        if (childHeaders && childHeaders.length){
            var opts = _.pick(this.props, 'maxHeaderDepth', 'pageScrollTop', 'listStyleTypes', 'skipDepth', 'nextHeader', 'mounted');
            var { content, depth } = this.props;
            return TableEntryChildren.renderChildrenElements(childHeaders, childDepth, content, opts);
        } else {
            return this.props.children;
        }
    }

    render(){
        // Removed: 'collapse' children if not over them (re: negative feedback)
        //if (this.props.depth >= 3 && !this.props.active) return null;
        var children = this.children();
        if (!children) return null;
        return <ol className="inner" style={{ 'listStyleType' : this.props.listStyleTypes[(this.props.depth || 0) + 1] }} children={children}/>;
    }
}


export class TableOfContents extends React.Component {

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
        if (children && typeof children === 'object' && children.props && children.props.children) return TableOfContents.textFromReactChildren(children.props.children);
        if (Array.isArray(children) && children.length > 0){
            var childrenWithChildren = _.filter(children, function(c){ return typeof c === 'string' || (c && c.props && c.props.children); });
            var childPrimaryElemIfAny = _.find(childrenWithChildren, function(c){ return c && typeof c === 'object' && c.props && (c.type === 'code' || c.type === 'strong' || c.type === 'b'); });
            if (childPrimaryElemIfAny){
                return TableOfContents.textFromReactChildren(childPrimaryElemIfAny);
            } else {
                return _.map(children, TableOfContents.textFromReactChildren).join('');
            }
        }
        return '';
    }

    static isHeaderComponent(c, maxHeaderDepth = 6){
        return (
            c && c.props &&
            typeof c.props.type === 'string' &&
            c.props.type.charAt(0).toLowerCase() === 'h' &&
            _.range(1, maxHeaderDepth + 1).indexOf(parseInt(c.props.type.charAt(1))) > -1
        );
    }

    static isContentJSX(content){
        if (!content || typeof content !== 'object') return false;
        var proto = Object.getPrototypeOf(content);
        return proto && proto.isPrototypeOf(React.Component.prototype);
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
        'populateAnchors' : true,
        'title' : "Contents",
        'pageTitle' : 'Introduction',
        'includeTop' : true,
        'includeNextPreviousPages' : true,
        'listStyleTypes' : ['none', 'decimal', 'lower-alpha', 'lower-roman'],
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

    nextPreviousSection(){
        var { context, includeNextPreviousPages } = this.props;
        if (!includeNextPreviousPages || (!context.next && !context.previous)) return null;
        return (
            <div className="next-previous-pages-section">
                <div className="row">
                { context.previous ?
                    <div className={"previous-section text-right col-xs-" + (context.next ? '6' : '12')}>
                        <h6 className="text-400 mb-03 mt-12"><i className="icon icon-fw icon-angle-left"/> Previous</h6>
                        <h6 className="text-500 mt-0"><a href={context.previous['@id']}>{ context.previous.display_title }</a></h6>
                    </div>
                : null }
                { context.next ?
                    <div className={"next-section col-xs-" + (context.previous ? '6' : '12')}>
                        <h6 className="text-400 mb-03 mt-12">Next <i className="icon icon-fw icon-angle-right"/></h6>
                        <h6 className="text-500 mt-0"><a href={context.next['@id']}>{ context.next.display_title }</a></h6>
                    </div>
                : null }
                </div>
            </div>
        );
    }

    render(){

        var listStyleTypes = this.props.listStyleTypes.slice(0);
        var { context, maxHeaderDepth, includeTop } = this.props;

        var skipDepth = 0;

        function sectionEntries(){
            var lastSection = null;
            return _(context.content).chain()
                .pairs()
                .map(function(entryPair){
                    return _.extend(entryPair[1], { 'link' : entryPair[0] });
                })
                .sortBy(function(s){
                    return s.order || 0;
                })
                .map((s, i, all)=>{
                    if (lastSection) lastSection.nextHeader = s.link;
                    lastSection = s;
                    if (all.length - 1 === i) s.nextHeader = 'bottom';
                    return s;
                })
                .map((s,i,all) => {
                    if (_.filter(all, function(section){ return section.title || s['toc-title']; }).length < 2){
                        skipDepth = 1;
                        var { childHeaders, childDepth } = TableEntryChildren.getHeadersFromContent(s.content, this.props.maxHeaderDepth, 1);
                        var opts = _.extend({ childHeaders, maxHeaderDepth, listStyleTypes, skipDepth }, {
                            'mounted' : this.state.mounted,
                            'pageScrollTop' : this.state.scrollTop,
                            'nextHeader' : s.nextHeader
                        });
                        return TableEntryChildren.renderChildrenElements(childHeaders, childDepth, s.content, opts);
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
                        nextHeader={s.nextHeader}
                        navigate={this.props.navigate}
                        maxHeaderDepth={maxHeaderDepth}
                        skipDepth={skipDepth}
                    />);
                })
                .flatten(false)
                .value();
        }

        var content = [];
            
        if (context && context.parent && context.parent['@id']){
            content.push(
                <li className="table-content-entry" data-depth="0" key="parent-link">
                    <span title="Up to page listing" className="top-of-page with-border-bottom visible-lg-block visible-lg">
                        <a className="text-500" href={context.parent['@id']}>{ context.parent['display_title'] }</a>
                    </span>
                </li>
            );
        }

        var children = sectionEntries.call(this);
        
        content.push(
            <TableEntry
                link="top"
                title={context['display_title'] || 'Top of Page' || null}
                key="top"
                depth={0}
                listStyleTypes={listStyleTypes}
                pageScrollTop={this.state.scrollTop}
                mounted={this.state.mounted}
                navigate={this.props.navigate}
                nextHeader={(children[0] && children[0].props && children[0].props.link) || null}
                maxHeaderDepth={maxHeaderDepth}
                skipDepth={skipDepth || 0}
                children={children}
            />
        );

        var marginTop = 0; // Account for test warning
        if (this.state.mounted && !isServerSide()){
            if (typeof this.state.scrollTop === 'number' && this.state.scrollTop < 80){
                var testWarningElem = document.getElementsByClassName('navbar-container test-warning-visible');
                marginTop = (testWarningElem[0] && testWarningElem[0].offsetHeight) || marginTop;
            }
        }

        var isEmpty = (Array.isArray(content) && !_.filter(content).length) || !content;

        return (
            <div key="toc" className="table-of-contents" ref="container" style={{
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
                {/* !isEmpty ? <h4 className="toc-title">{ this.props.title }</h4> : null */}
                { !isEmpty ? 
                    <ol className="inner" children={content} style={{
                        'listStyleType' : listStyleTypes[0],
                        'paddingLeft' : 0
                    }}/>
                : null }
                { this.nextPreviousSection() }
            </div>
        );
    }

}



export class MarkdownHeading extends React.Component {

    static getAttributes(children){
        children = Array.isArray(children) ? children : [children];
        var attr = { 'id' : null, 'className' : null, 'matchedString' : null };

        let childrenOuterText = _.filter(children, function(c){ return typeof c === 'string'; }).join(' ');
        let attrMatch = childrenOuterText.match(/({:[.-\w#]+})/g);
        if (attrMatch && attrMatch.length){
            attr.matchedString = attrMatch[0];
            attrMatch = attrMatch[0].replace('{:', '').replace('}', '');
            var idMatch = attrMatch.match(/(#[-\w]+)/g);
            if (idMatch && idMatch.length){
                idMatch = idMatch[0].replace('#', '');
                attr.id = idMatch;
                attrMatch = attrMatch.replace('#' + idMatch, '');
            }
            attr.className = attrMatch.split('.').join(' ').trim();
        }
        return attr;
    }

    static defaultProps = {
        'type' : 'h1',
        'id' : null
    }

    constructor(props){
        super(props);
        this.getID = this.getID.bind(this);
        this.render = this.render.bind(this);
    }

    getID(set = false, id = null){
        if (typeof this.id === 'string') return this.id;
        var idToSet = id || (this.props && this.props.id) || TableOfContents.slugifyReactChildren(this.props.children);
        if (set){
            this.id = idToSet;
        }
        return idToSet;
    }

    componentWillUnmount(){ delete this.id; }

    render(){
        var { type, children } = this.props;
        children = Array.isArray(children) ? children : [children];
        var propsToPass = {
            'children' : children,
            'id' : null
        };

        var attributes = MarkdownHeading.getAttributes(children);

        if (attributes && attributes.matchedString){
            propsToPass.children = _.map(children, function(c){
                if (typeof c === 'string') return c.replace(attributes.matchedString, '');
                return c;
            });
            if (attributes.id) {
                propsToPass.id = this.getID(true, attributes.id);
            }
            if (attributes.className) {
                propsToPass.className = attributes.className;
            }
        }
        if (!propsToPass.id) propsToPass.id = this.getID(true);
        return React.createElement(type, propsToPass);
    }
}


