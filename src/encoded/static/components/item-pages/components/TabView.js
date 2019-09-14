'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import memoize from 'memoize-one';

import { navigate, console, analytics } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { UserContentBodyList } from './../../static-pages/components/UserContentBodyList';



/**
 * Notes:
 * We memoize the global/static functions because we only expect a single
 * TabView to exist per Page view.
 */


/** Choose FontAwesome Icon for a given custom tabName. Hardcoded. */
export function getIconForCustomTab(tabName){
    switch(tabName){
        case 'summary':
        case 'overview':
        case 'experiment-summaries':
        case 'experiment_summaries':
            return 'file-text';
        case 'data_processing':
            return 'area-chart';
        case 'processed_files':
            return 'microchip';
        case 'higlass':
        case 'higlass_displays':
            return 'television';
        default:
            return null;
    }
}

/** Choose pretty title for a given tabName. Hardcoded. */
export function getTitleForCustomTab(tabName){
    switch(tabName){
        case 'experiment-summaries':
            return 'Experiment Summaries';
        case 'higlass':
            return 'HiGlass';
        case 'higlass_displays':
            return 'HiGlass Displays';
        default:
            return null; // Fallback: Will convert tabKey _ to " " and capitalize words.
    }
}


export class TabView extends React.PureComponent {

    /** Returns key of first item with `isDefault: true` or first item. */
    static getDefaultActiveKeyFromContents(contents){
        var defaultActiveTab = _.findWhere(contents, { 'isDefault' : true });
        if (typeof defaultActiveTab !== 'undefined' && typeof defaultActiveTab.key !== 'undefined'){
            return defaultActiveTab.key;
        }
        if (contents.length > 0){
            return contents[0].key;
        }
        return null;
    }

    static createTabObject(key, title, icon, tabContent, extraProps = {}){
        return {
            'key' : key,
            'tab' : (
                <span>
                    { icon ? <React.Fragment><i className={"icon icon-fw icon-" + icon}/> </React.Fragment> : null }
                    { title }
                </span>
            ),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">{ title }</h3>
                    <hr className="tab-section-title-horiz-divider mb-1"/>
                    <UserContentBodyList contents={_.pluck(tabContent, 'content')} {...extraProps} />
                </div>
            )
        };
    }

    static calculateAdditionalTabs = memoize(function(staticContentList, contents){

        // If func, run it to return contents.
        // Do this here so that memoization is useful, else will always be new instance
        // of a `contents` array.
        if (typeof contents === 'function') contents = contents();


        const resultArr = [];
        //
        // PART 1
        // Content grouped by 'tab:some_title' is put into new tab with 'Some Title' as title.
        //

        const existingTabKeys = _.pluck(contents, 'key');
        let staticTabContent = _.filter(staticContentList, function(s){
            return s.content && !s.content.error && typeof s.location === 'string' && s.location.slice(0,4) === 'tab:';
        });

        // Filter down to locations which don't already exist in our tabs.
        staticTabContent = _.filter(
            _.map(staticTabContent, function(s){
                const splitLocation = s.location.split(':');
                const tabKey = splitLocation.slice(1).join(':'); // This could have more ':'s in it, theoretically.
                return _.extend({ tabKey }, s);
            }),
            function(s){
                return existingTabKeys.indexOf(s.tabKey) === -1;
            }
        );

        const groupedContent = _.groupBy(staticTabContent, 'tabKey');

        _.pairs(groupedContent).forEach(function([ tabKey, contentForTab ]){
            let tabTitle = contentForTab.title || getTitleForCustomTab(tabKey);
            if (!tabTitle){ // Auto-generate one from key
                tabTitle = _.map(
                    tabKey.split('_'),
                    function(str){
                        return str.charAt(0).toUpperCase() + str.slice(1);
                    }
                ).join(' ');
            }

            const icon = contentForTab.icon || getIconForCustomTab(tabKey);

            resultArr.push(TabView.createTabObject(tabKey, tabTitle, icon, contentForTab));
        });

        //
        // PART 2
        // Content with position : 'tab' gets its own tab.
        //

        const staticTabContentSingles = _.filter(staticContentList, function(s){
            return s.content && !s.content.error && s.location === 'tab';
        });

        _.forEach(staticTabContentSingles, function(s, idx){
            const { content: { title = null, options : { title_icon = null } } } = s;
            const showTitle = title || 'Custom Tab ' + (idx + 1);
            const tabKey = title.toLowerCase().split(' ').join('_');
            resultArr.push(TabView.createTabObject(tabKey, showTitle, title_icon, [s], { 'hideTitles' : true }));
        });

        return resultArr;
    });

    static combineSystemAndCustomTabs = memoize(function(additionalTabs, contents){
        if (typeof contents === 'function') contents = contents();
        let allTabs;
        if (additionalTabs.length === 0){
            allTabs = contents;
        } else {
            const addBeforeTabs = ['details', 'attribution'];
            const addIdx = _.findIndex(contents, function(t){ return addBeforeTabs.indexOf(t.key) > -1; });

            if (typeof addIdx !== 'number'){
                allTabs = contents.concat(additionalTabs);
            } else {
                allTabs = contents.slice(0);
                allTabs.splice(addIdx, 0, ...additionalTabs);
            }
        }
        return allTabs;
    });

    static propTypes = {
        'contents' : PropTypes.oneOfType([PropTypes.func, PropTypes.arrayOf(PropTypes.shape({
            'tab'       : PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
            'content'   : PropTypes.element.isRequired,
            'key'       : PropTypes.string.isRequired,
            'disabled'  : PropTypes.bool,
            'cache'     : PropTypes.bool
        }))  ]).isRequired,
        'href' : PropTypes.string.isRequired
    };

    static defaultProps = {
        'contents' : [
            { tab : "Tab 1", content : <span>Test1</span>, key : 'tab-id-1' },
            { tab : "Tab 2", content : <span>Test2</span>, key : 'tab-id-2' }
        ],
        'animated' : false,
        'destroyInactiveTabPane' : false // Maybe make true? Need to profile performance
    };

    constructor(props){
        super(props);
        this.getActiveKey = this.getActiveKey.bind(this);
        this.setActiveKey = this.setActiveKey.bind(this);
        this.getTabByHref = this.getTabByHref.bind(this);
        this.maybeSwitchTabAccordingToHref = this.maybeSwitchTabAccordingToHref.bind(this);
        this.onTabClick = this.onTabClick.bind(this);

        this.state = {
            currentTabKey : (props.contents && TabView.getDefaultActiveKeyFromContents(props.contents)) || null
        };

        this.tabsRef = React.createRef();
    }

    componentDidMount(){
        // We don't get hash in URL until we're clientside so
        // we defer until are mounted before setting/switching-to a currentTabKey.
        this.maybeSwitchTabAccordingToHref();
    }

    componentDidUpdate(pastProps, pastState){
        if (pastProps.href !== this.props.href){
            this.maybeSwitchTabAccordingToHref();
        }
    }

    getActiveKey(){
        return this.state.currentTabKey;
    }

    setActiveKey(nextKey){
        this.setState({ 'currentTabKey' : nextKey });
    }

    getTabByHref(){
        const { contents, href } = this.props;
        const hrefParts = url.parse(href);
        const hash = typeof hrefParts.hash === 'string' && hrefParts.hash.length > 0 && hrefParts.hash.slice(1);
        const currKey = this.getActiveKey();

        if (currKey === hash){
            return null;
        }

        const allContentObjs = hash && TabView.combineSystemAndCustomTabs(this.additionalTabs(), contents);
        const foundContent = Array.isArray(allContentObjs) && _.findWhere(allContentObjs, { 'key' : hash });

        if (!foundContent){
            return null;
        }

        return foundContent;
    }

    maybeSwitchTabAccordingToHref(){
        const foundContent = this.getTabByHref();
        if (!foundContent){
            // Already on tab or could not find content with hash -
            console.error('Could not find or already on tab');
            return false;
        }
        if (foundContent.disabled){
            console.error('Tab is disabled', foundContent);
            // Same page, remove hash
            navigate('', { 'skipRequest' : true, 'dontScrollToTop' : true, 'replace' : true });
            return false;
        }
        this.setActiveKey(foundContent.key); // Same as `hash`
        return true;
    }

    additionalTabs(){
        const { context : { static_content = [] }, contents } = this.props;

        if (static_content.length === 0) return []; // No content defined for Item.

        return TabView.calculateAdditionalTabs(static_content, contents);
    }

    onTabClick(tabKey, evt){
        const { onTabClick } = this.props;

        // We add 'replace: true' to replace current Browser History entry with new entry.
        // Entry will refer to same pathname but different hash.
        // This is so people don't need to click 'back' button 10 times to get to previous /search/ or /browse/ page for example,
        // since they might browse around tabs for some time.
        navigate(
            '#' + tabKey, // Change replace to `false` to save in browser history.
            { 'skipRequest' : true, 'dontScrollToTop' : true, 'replace' : true }
        );

        if (typeof onTabClick === 'function'){
            return onTabClick(tabKey, evt);
        }
    }

    render(){
        const { contents, windowWidth, prefixTabs = [], suffixTabs = [] } = this.props;
        const { currentTabKey } = this.state;

        const allTabs = TabView.combineSystemAndCustomTabs(this.additionalTabs(), contents);
        const currentTabIdx = _.findIndex(allTabs, { 'key' : currentTabKey });
        const currentTab = allTabs[currentTabIdx];

        if (!currentTab) {
            throw new Error("Tab not available in list of tabs -", currentTabKey);
        }

        return (
            <React.Fragment>
                <TabsBar tabs={allTabs} onTabClick={this.onTabClick} {...{ currentTab, prefixTabs, suffixTabs }} />
                <TabPane {...{ currentTab, currentTabIdx }} />
            </React.Fragment>
        );
    }
}

const TabsBar = React.memo(function TabsBar({ tabs, currentTab, onTabClick, prefixTabs = [], suffixTabs = [] }){
    const { key: currentTabKey } = currentTab;
    const renderedTabs = tabs.map(function(tabObj, idx){
        const { tab: children, key, disabled = false } = tabObj;
        const cls = (
            "tab-item" +
            (key === currentTabKey ? " active" : "") +
            (disabled ? " disabled" : " clickable")
        );
        const onClick = function(e){
            e.stopPropagation();
            onTabClick(key);
        };
        return (
            <div className={cls} key={key} data-tab-for={key} data-tab-index={idx} onClick={!disabled && onClick}>
                { children }
            </div>
        );
    });

    // Rendered, probably static tabs (or controlled externally)
    prefixTabs.forEach(function({ tab, key = null, className = null, onClick = null }, idx){
        let cls = "tab-item tab-prefix";
        if (className) {
            cls += " " + className;
        }
        renderedTabs.unshift(
            <div className={cls} key={key || "prefix-" + idx} onClick={onClick}>
                { tab }
            </div>
        );
    });
    suffixTabs.forEach(function({ tab, key = null, className = null, onClick = null }, idx){
        let cls = "tab-item tab-suffix";
        if (className) {
            cls += " " + className;
        }
        if (typeof onClick === 'function'){
            cls += " clickable";
        }
        renderedTabs.push(
            <div className={cls} key={key || "suffix-" + idx} onClick={onClick}>
                { tab }
            </div>
        );
    });

    return (
        <div className="tabs-bar-outer">
            <div className="tabs-bar">
                { renderedTabs }
            </div>
        </div>
    );
});

class TabPane extends React.PureComponent {

    constructor(props){
        super(props);
        this.cacheCurrentTabContent = this.cacheCurrentTabContent.bind(this);
        this.cachedContent = {};
    }

    cacheCurrentTabContent(){
        const { currentTab, currentTabIdx: idx } = this.props;
        const { key, content, cache = true } = currentTab;
        this.cachedContent[key] = { content, idx, key, cache };
    }

    render(){
        this.cacheCurrentTabContent();

        const { currentTab : { key: currKey } } = this.props;

        return _.values(this.cachedContent).filter(function(viewObj){
            return viewObj && (viewObj.cache || viewObj.key === currKey);
        }).map(function({ content, idx, key }){
            const cls = "tab-pane-outer" + (currKey === key ? " active" : " d-none");
            return (
                <div className={cls} data-tab-key={key} id={key} key={key || idx}>
                    <TabPaneErrorBoundary>
                        { content }
                    </TabPaneErrorBoundary>
                </div>
            );
        });
    }

}

class TabPaneErrorBoundary extends React.PureComponent {

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    constructor(props){
        super(props);
        this.state = { hasError: false };
    }

    componentDidCatch(error, info){
        analytics.exception("TabPaneErrorBoundary: " + info.componentStack);
        console.error("Caught error", error, info);
    }

    render(){
        const { children } = this.props;
        const { hasError } = this.state;

        if (hasError){
            return (
                <div className="error-boundary-container container">
                    <div className="error-msg-container mt-3 mb-3 row">
                        <i className="icon icon-times fas col-auto"/>
                        <h4 className="text-400 mb-0 mt-0 col">A client-side error has occured, please go back or try again later.</h4>
                    </div>
                </div>
            );
        }

        return children;
    }

}
