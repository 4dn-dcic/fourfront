'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import Tabs, { TabPane, TabContent } from './../../lib/rc-tabs';
import ScrollableInkTabBar from './../../lib/rc-tabs/ScrollableInkTabBar';
import { navigate } from './../../util';
import { BasicUserContentBody, UserContentBodyList } from './../../static-pages/components/BasicStaticSectionBody';



export function getIconForCustomTab(tabName){
    switch(tabName){
        case 'summary':
        case 'overview':
        case 'experiment-summaries':
            return 'file-text';
        case 'higlass':
        case 'higlass_displays':
            return 'television';
        default:
            return null;
    }
}

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



/**
 * @prop {Object[]} contents - List of objects for tabs containing 'tab', 'content', and maybe 'key'.
 */

export class TabbedView extends React.Component {

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

    static renderTabPane(tabObj, tabIndex = 0){
        return (
            <Tabs.TabPane
                key={tabObj.key || tabObj.tab || tabIndex}
                data-tab-key={tabObj.key}
                id={'tab:' + tabObj.key}
                tab={<span className="tab" data-tab-key={tabObj.key} children={tabObj.tab}/>}
                children={tabObj.content} placeholder={tabObj.placeholder} disabled={tabObj.disabled} style={tabObj.style} />
        );
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

    static propTypes = {
        'contents' : PropTypes.oneOfType([PropTypes.func, PropTypes.arrayOf(PropTypes.shape({
            'tab'       : PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
            'content'   : PropTypes.element.isRequired,
            'key'       : PropTypes.string.isRequired,
            'disabled'  : PropTypes.bool
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
        this.setActiveKey = this.setActiveKey.bind(this);
        this.maybeSwitchTabAccordingToHref = this.maybeSwitchTabAccordingToHref.bind(this);
        this.onTabClick = this.onTabClick.bind(this);
        this.render = this.render.bind(this);
    }

    componentDidMount(){
        this.maybeSwitchTabAccordingToHref();
    }

    componentDidUpdate(pastProps){
        if (pastProps.href !== this.props.href){
            this.maybeSwitchTabAccordingToHref();
        }
    }

    maybeSwitchTabAccordingToHref(props = this.props){
        var { contents, href } = props,
            hrefParts       = url.parse(href),
            hash            = typeof hrefParts.hash === 'string' && hrefParts.hash.length > 0 && hrefParts.hash.slice(1),
            contentObjs     = hash && (typeof contents === 'function' ? contents() : contents),
            foundContent    = Array.isArray(contentObjs) && _.findWhere(contentObjs, { 'key' : hash }),
            currKey         = foundContent && this.refs.tabs.state.activeKey;

        if (!foundContent || currKey === hash) return false;
    
        this.setActiveKey(foundContent.key); // Same as `hash`
        return true;
    }

    setActiveKey(nextKey){
        if (this.refs.tabs && typeof this.refs.tabs.setActiveKey === 'function'){
            return this.refs.tabs.setActiveKey(nextKey);
        } else {
            console.error('Manually setting active tab key not currently supported...');
            return false;
        }
    }

    onTabClick(tabKey, evt){
        var { onTabClick } = this.props;

        // We add 'replace: true' to replace current Browser History entry with new entry.
        // Entry will refer to same pathname but different hash.
        // This is so people don't need to click 'back' button 10 times to get to previous /search/ or /browse/ page for example,
        // since they might browse around tabs for some time.
        navigate('#' + tabKey, { 'skipRequest' : true, 'dontScrollToTop' : true, 'replace' : true });

        if (typeof onTabClick === 'function'){
            return onTabClick(tabKey, evt);
        }
    }

    additionalTabs(){
        var { context, contents } = this.props,
            resultArr = [],
            staticContentList = (Array.isArray(context.static_content) && context.static_content.length > 0 && context.static_content) || [];

        if (staticContentList.length === 0) return []; // No content defined for Item.

        if (typeof contents === 'function') contents = contents();

        //
        // PART 1
        // Content grouped by 'tab:some_title' is put into new tab with 'Some Title' as title.
        //

        var existingTabKeys = _.pluck(contents, 'key'),
            staticTabContent = _.filter(staticContentList, function(s){
                return s.content && !s.content.error && typeof s.location === 'string' && s.location.slice(0,4) === 'tab:';
            });

        // Filter down to locations which don't already exist in our tabs.
        staticTabContent = _.filter(
            _.map(staticTabContent, function(s){
                var splitLocation   = s.location.split(':'),
                    tabKey          = splitLocation.slice(1).join(':'); // This could have more ':'s in it, theoretically.
                return _.extend({ tabKey }, s);
            }),
            function(s){
                return existingTabKeys.indexOf(s.tabKey) === -1;
            }
        );

        var groupedContent = _.groupBy(staticTabContent, 'tabKey');

        _.forEach(_.pairs(groupedContent), function([ tabKey, contentForTab ]){

            var tabTitle, icon;

            tabTitle = contentForTab.title || getTitleForCustomTab(tabKey);
            if (!tabTitle){ // Auto-generate one from key
                tabTitle = _.map(
                    tabKey.split('_'),
                    function(str){
                        return str.charAt(0).toUpperCase() + str.slice(1);
                    }
                ).join(' ');
            }

            icon = contentForTab.icon || getIconForCustomTab(tabKey);

            resultArr.push(TabbedView.createTabObject(tabKey, tabTitle, icon, contentForTab));
        });

        //
        // PART 2
        // Content with position : 'tab' gets its own tab.
        //

        var staticTabContentSingles = _.filter(staticContentList, function(s){
            return s.content && !s.content.error && s.location === 'tab';
        });


        _.forEach(staticTabContentSingles, function(s, idx){
            var content = s.content,
                title   = content.title || 'Custom Tab ' + (idx + 1),
                tabKey  = title.toLowerCase().split(' ').join('_'),
                icon    = (content.options && content.options.title_icon) || null;

            resultArr.push(TabbedView.createTabObject(tabKey, title, icon, [s], { 'hideTitles' : true }));
        });
    
        return resultArr;

    }

    render(){
        var { contents, extraTabContent, activeKey, animated, onChange, destroyInactiveTabPane, renderTabBar, renderTabContent } = this.props;
        if (typeof contents === 'function') contents = contents();
        if (!Array.isArray(contents)) return null;

        var additionalTabs = this.additionalTabs(),
            allTabs;

        if (additionalTabs.length === 0){
            allTabs = contents;
        } else {
            var addBeforeTabs   = ['details', 'audits', 'attribution'],
                addIdx          = _.findIndex(contents, function(t){ return addBeforeTabs.indexOf(t.key) > -1; });

            if (typeof addIdx !== 'number'){
                allTabs = contents.concat(additionalTabs);
            } else {
                allTabs = contents.slice(0);
                allTabs.splice(addIdx, 0, ...additionalTabs);
            }
        }

        var tabsProps = {
            'renderTabBar'          : () => <ScrollableInkTabBar onTabClick={this.onTabClick} extraContent={extraTabContent} className="extra-style-2" />,
            'renderTabContent'      : () => <TabContent animated={animated} />,
            'onChange'              : onChange,
            'destroyInactiveTabPane': destroyInactiveTabPane,
            'ref'                   : 'tabs',
            'defaultActiveKey'      : TabbedView.getDefaultActiveKeyFromContents(contents),
            'children'              : _.map(allTabs, TabbedView.renderTabPane)
        };

        if (activeKey) tabsProps.activeKey = activeKey;

        return <Tabs {...tabsProps} />;
    }

}

