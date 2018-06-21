'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Tabs, { TabPane, TabContent } from './../../lib/rc-tabs';
import ScrollableInkTabBar from './../../lib/rc-tabs/ScrollableInkTabBar';


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
                key={tabObj.key || tabObj.tab || tabObj.title || tabIndex}
                tab={<span className="tab">{ tabObj.tab || tabObj.title }</span>}
                children={tabObj.content}
                placeholder={tabObj.placeholder}
                disabled={tabObj.disabled}
                style={tabObj.style}
            />
        );
    }

    static propTypes = {
        'contents' : PropTypes.oneOfType([PropTypes.func, PropTypes.arrayOf(PropTypes.shape({
            'tab' : PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
            'content' : PropTypes.element.isRequired
        }))  ]).isRequired
    }

    static defaultProps = {
        'contents' : [
            { tab : "Tab 1", content : <span>Test1</span> },
            { tab : "Tab 2", content : <span>Test2</span> }
        ],
        'animated' : false
    }

    constructor(props){
        super(props);
        this.setActiveKey = this.setActiveKey.bind(this);
        this.render = this.render.bind(this);
    }

    setActiveKey(nextKey){
        if (this.refs.tabs && typeof this.refs.tabs.setActiveKey === 'function'){
            return this.refs.tabs.setActiveKey(nextKey);
        } else {
            console.error('Manually setting active tab key not currently supported...');
            return false;
        }
    }

    render(){
        var { contents, onTabClick, extraTabContent, activeKey, animated, onChange, destroyInactiveTabPane, renderTabBar, renderTabContent } = this.props;
        if (typeof contents === 'function') contents = contents();
        if (!Array.isArray(contents)) return null;

        var tabsProps = {
            'renderTabBar'          : () => <ScrollableInkTabBar onTabClick={onTabClick} extraContent={extraTabContent} className="extra-style-2" />,
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
