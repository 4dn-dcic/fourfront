'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import Tabs, { TabPane, TabContent } from './../../lib/rc-tabs';
import ScrollableInkTabBar from './../../lib/rc-tabs/ScrollableInkTabBar';
import { navigate } from './../../util';
import { BasicUserContentBody, UserContentBodyList } from './../../static-pages/components/BasicStaticSectionBody';


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

    static propTypes = {
        'contents' : PropTypes.oneOfType([PropTypes.func, PropTypes.arrayOf(PropTypes.shape({
            'tab'       : PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
            'content'   : PropTypes.element.isRequired,
            'key'       : PropTypes.string.isRequired,
            'disabled'  : PropTypes.bool
        }))  ]).isRequired,
        'href' : PropTypes.string.isRequired
    }

    static defaultProps = {
        'contents' : [
            { tab : "Tab 1", content : <span>Test1</span>, key : 'tab-id-1' },
            { tab : "Tab 2", content : <span>Test2</span>, key : 'tab-id-2' }
        ],
        'animated' : false,
        'destroyInactiveTabPane' : false // Maybe make true? Need to profile performance
    }

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
            staticTabContent = _.filter(
                (Array.isArray(context.static_content) && context.static_content.length > 0 && context.static_content) || [],
                function(s){ return s.content && !s.content.error && typeof s.location === 'string' && s.location.slice(0,4) === 'tab:'; }
            );

        if (staticTabContent.length === 0) return [];

        if (typeof contents === 'function') contents = contents();

        var existingTabKeys = _.pluck(contents, 'key');

        // Filter down to locations which don't already exist in our tabs.
        staticTabContent = _.filter(
            _.map(staticTabContent, function(s){
                return _.extend({ 'tabKey' : s.location.slice(4) }, s);
            }),
            function(s){
                return existingTabKeys.indexOf(s.tabKey) === -1;
            }
        );

        var groupedContent = _.groupBy(staticTabContent, 'tabKey');

        return _.map(_.pairs(groupedContent), function([ tabKey, contentForTab ]){

            var xformedKeyAsTitle = _.map(
                tabKey.split('_'),
                function(str){
                    return str.charAt(0).toUpperCase() + str.slice(1);
                }
            ).join(' ');

            return {
                'key' : tabKey,
                'tab' : <span className="text-500">{ xformedKeyAsTitle }</span>,
                'content' : (
                    <div className="overflow-hidden">
                        <h3 className="tab-section-title">
                            <span>{ xformedKeyAsTitle }</span>
                        </h3>
                        <hr className="tab-section-title-horiz-divider mb-1"/>
                        <UserContentBodyList contents={_.pluck(contentForTab, 'content')} />
                    </div>
                )
            };
        });

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


//export class 

