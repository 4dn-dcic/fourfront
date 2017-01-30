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
                    'pageScrollTop' : 0,
                    'depth' : null,
                    'listStyleTypes' : null,
                    'mounted' : null,
                    'content' : null,
                    'nextHeader' : null
                };
            },

            shouldComponentUpdate : function(nextProps, nextState){
                if (
                    nextProps.mounted !== this.props.mounted ||
                    nextProps.pageScrollTop !== this.props.pageScrollTop
                    //this.determineIfActive(nextProps) !== this.determineIfActive(this.props)
                ){
                    return true;
                }
                return false;
            },

            getTargetElement : function(link = this.props.link){
                if (typeof document === 'undefined' || !document || !window) return null; // Not clientside.
                if (typeof this.targetElement === 'undefined' || !this.targetElement){
                    // Cache it for performance. Doesn't needa be in state as won't change.
                    this.targetElement = d3.select('[id="' + link + '"]').node();
                }
                return this.targetElement;
            },

            getNextHeaderElement : function(props = this.props){
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
                        return function(t){ document.body.scrollTop = interpolate(t); };
                    };
                }
                var origScrollTop = document.body.scrollTop;
                d3.select(document.body)
                    .interrupt()
                    .transition()
                    .duration(750)
                    .tween("bodyScroll", scrollTopTween(elementTop))
                    .on('end', () => {
                        if (typeof this.props.navigate === 'function'){
                            var link = this.props.link;
                            setTimeout(()=>{
                                if (link === 'top' || link === 'bottom') link = '';
                                this.props.navigate('#' + link, { 'replace' : true, 'skipRequest' : true });
                            }, link === 'top' || origScrollTop <= 40  ? 800 : 0);
                        }
                    });

            }, 300),

            determineIfActive : function(props = this.props){

                if (!props.mounted) return false;

                var targetElem, elemTop;
                
                if (props.depth === 0 && props.mounted){
                    elemTop = 0;
                } else {
                    targetElem = this.getTargetElement(props.link);
                    elemTop = TableOfContents.getElementTop(targetElem);
                    if (props.mounted && document && document.body && document.body.scrollHeight && window && window.innerHeight){
                        // Try to prevent from trying to scroll past max scrollable height.
                        elemTop = Math.min(document.body.scrollHeight - window.innerHeight, elemTop);
                    }
                }
                
                if (typeof elemTop !== 'number') return null;

                if (props.nextHeader) {
                    var nextHeaderTop = null;
                    if (typeof props.nextHeader === 'number'){
                        nextHeaderTop = props.nextHeader;
                    } else {
                        var nextHeaderElement = this.getNextHeaderElement(props);
                        if (nextHeaderElement) nextHeaderTop = TableOfContents.getElementTop(nextHeaderElement);
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

            },

            render : function(){
                var title = this.props.title;
                var subtitle = null;
                var active = this.determineIfActive();

                if (this.props.depth === 0){
                    subtitle = title;
                    title = "Top of Page";
                }
                

                if (typeof this.props.link === 'string' && this.props.link.length > 0){
                    title = (
                        <a href={'#' + this.props.link} onClick={(e)=>{ 
                            e.preventDefault(); 
                            //e.target.blur();
                            this.handleClick();
                        }}>
                            { title }
                        </a>
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
                        <TableOfContents.EntryChildren
                            active={active}
                            content={this.props.content}
                            depth={this.props.depth}
                            mounted={this.props.mounted}
                            listStyleTypes={this.props.listStyleTypes}
                            pageScrollTop={this.props.pageScrollTop}
                            nextHeader={this.props.nextHeader}
                            children={this.props.children}
                            navigate={this.props.navigate}
                            link={this.props.link}
                            maxHeaderDepth={this.props.maxHeaderDepth}
                        />
                    </li>
                );
            }
        }),

        EntryChildren : React.createClass({

            shouldComponentUpdate : function(nextProps){
                if (nextProps.active) return true;
                if (nextProps.depth === 0) return true;
                if (nextProps.mounted !== this.props.mounted) return true;
                if (nextProps.active !== this.props.active) return true;
                return false;
            },

            getHeadersFromContent : function(){
                //if (Array.isArray(this.childHeaders) && this.childHeaders.length > 0) return this.childHeaders;
                if (!TableOfContents.isContentJSX(this.props.content)) return [];
                return this.props.content.props.children.filter((child,i,a) =>
                    TableOfContents.isHeaderComponent(child, this.props.maxHeaderDepth || 6) && child.props.type === 'h' + (this.props.depth + 1)
                );
            },

            getSubsequentChildHeaders : function(header){
                if (!TableOfContents.isContentJSX(this.props.content)) return null;

                var getNext = null;
                var nextMajorHeader = null;
                var nextHeaderComponents = _.reduce(this.props.content.props.children, (m, child)=>{
                    if (getNext === null && child === header){
                        getNext = true;
                        return m;
                    }
                    if (getNext && TableOfContents.isHeaderComponent(child, this.props.maxHeaderDepth || 6)){
                        if (
                            child.props.type === 'h' + Math.max(this.props.depth + 1, 1) ||
                            child.props.type === 'h' + Math.max(this.props.depth    , 1) ||
                            child.props.type === 'h' + Math.max(this.props.depth - 1, 1) ||
                            child.props.type === 'h' + Math.max(this.props.depth - 2, 1)
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
                    'content' : React.cloneElement(this.props.content, {}, nextHeaderComponents),
                    'nextMajorHeader' : nextMajorHeader
                };
            },

            children : function(){
                var childHeaders = this.getHeadersFromContent();
                if (childHeaders && childHeaders.length){
                    return childHeaders.map((h, index) =>{
                        var hString = TableOfContents.textFromReactChildren(h.props.children);
                        var childContent = this.getSubsequentChildHeaders(h);
                        var link = TableOfContents.slugify(hString);
                        return (
                            <TableOfContents.TableEntry 
                                link={link}
                                title={hString}
                                key={link}
                                depth={(this.props.depth || 0) + 1}
                                listStyleTypes={this.props.listStyleTypes}
                                pageScrollTop={this.props.pageScrollTop}
                                mounted={this.props.mounted}
                                content={childContent.content}
                                nextHeader={childContent.nextMajorHeader || this.props.nextHeader || null}
                                navigate={this.props.navigate}
                                maxHeaderDepth={this.props.maxHeaderDepth}
                            />
                        );
                    });
                } else {
                    return this.props.children;
                }
            },

            render : function(){
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
        }),

        getElementTop : function(el){
            if (!(typeof window !== 'undefined' && window && document && document.body)) return null;
            if (!el || typeof el.getBoundingClientRect !== 'function') return null;
            var bodyRect = document.body.getBoundingClientRect();
            var boundingRect = el.getBoundingClientRect();
            return boundingRect.top - bodyRect.top;
        },

        /** Taken from https://gist.github.com/mathewbyrne/1280286 */
        slugify : function (text) {
            return text.toString().toLowerCase()
                .replace(/\s+/g, '-')           // Replace spaces with -
                .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                .replace(/^-+/, '')             // Trim - from start of text
                .replace(/-+$/, '');            // Trim - from end of text
        },

        slugifyReactChildren : function(children){ return TableOfContents.slugify(TableOfContents.textFromReactChildren(children)); },

        textFromReactChildren : function(children){
            if (typeof children === 'string') return children;
            if (Array.isArray(children)){
                return children.filter(function(c){ return typeof c === 'string'; }).join('');
            }
        },

        isHeaderComponent : function(c, maxHeaderDepth = 6){
            return (
                c && c.props &&
                typeof c.props.type === 'string' &&
                c.props.type.charAt(0).toLowerCase() === 'h' &&
                [1,2,3,4,5,6].filter(function(n){ return n <= maxHeaderDepth; }).indexOf(parseInt(c.props.type.charAt(1))) > -1
            );
        },

        isContentJSX : function(content){ return content && content.__proto__ && content.__proto__.isPrototypeOf(React.Component.prototype); },

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
            'title' : "Contents",
            'pageTitle' : 'Introduction',
            'includeTop' : false,
            'listStyleTypes' : ['none','decimal', 'lower-alpha', 'lower-roman'],
            'maxHeaderDepth' : 3
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

    onResize : _.debounce(function(e){
        setTimeout(()=>{
            this.setState({ 'scrollTop' : parseInt(document.body.scrollTop) });
        }, 0);
    }, 300),

    componentDidMount : function(e){
        if (window && document && document.body){
            this.setState(
                { 'mounted' : true, 'scrollTop' : parseInt(document.body.scrollTop) },
                () => { 
                    window.addEventListener('scroll', this.onPageScroll);
                    window.addEventListener('resize', this.onResize);
                }
            );
        }
    },

    shouldComponentUpdate : function(nextProps,nextState){
        if (nextState.mounted !== this.state.mounted) return true;
        if (nextState.scrollTop !== this.state.scrollTop) return true;
        return false;
    },

    componentWillUnmount : function(){
        // Cleanup
        window.removeEventListener('scroll', this.onPageScroll);
        window.removeEventListener('resize', this.onResize);
    },

    render : function(){

        var listStyleTypes = this.props.listStyleTypes.slice(0);

        function sectionEntries(){
            var lastSection = null;
            return _(this.props.context.content).chain()
                .pairs()
                .map(function(entryPair){
                    return _.extend(entryPair[1], { 'link' : entryPair[0] });
                })
                .sortBy('order')
                .filter(function(s){
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
                    return (<TableOfContents.TableEntry 
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
                    />);
                })
                .value();
        }

        var content;
        if (this.props.includeTop) {
            var children = sectionEntries.call(this);
            content = (
                <TableOfContents.TableEntry 
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
                >
                    { children }
                </TableOfContents.TableEntry>
            );
        } else {
            content = sectionEntries.call(this);
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
                    : 1000)
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

});