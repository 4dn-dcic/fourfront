'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import Tabs, { TabPane, TabContent } from './../../lib/rc-tabs';
import ScrollableInkTabBar from './../../lib/rc-tabs/ScrollableInkTabBar';
import { navigate } from './../../util';


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

    render(){
        var { contents, extraTabContent, activeKey, animated, onChange, destroyInactiveTabPane, renderTabBar, renderTabContent } = this.props;
        if (typeof contents === 'function') contents = contents();
        if (!Array.isArray(contents)) return null;

        var tabsProps = {
            'renderTabBar'          : () => <ScrollableInkTabBar onTabClick={this.onTabClick} extraContent={extraTabContent} className="extra-style-2" />,
            'renderTabContent'      : () => <TabContent animated={animated} />,
            'onChange'              : onChange,
            'destroyInactiveTabPane': destroyInactiveTabPane,
            'ref'                   : 'tabs',
            'defaultActiveKey'      : TabbedView.getDefaultActiveKeyFromContents(contents)
        };

        if (activeKey) tabsProps.activeKey = activeKey;
        return <Tabs {...tabsProps} children={_.map(contents, TabbedView.renderTabPane)}/>;
    }

}
