'use strict';

var React = require('react');
var _ = require('underscore');

import Tabs, { TabPane, TabContent } from './../../lib/rc-tabs';
import ScrollableInkTabBar from './../../lib/rc-tabs/ScrollableInkTabBar';

export default class TabView extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render(){
        if (!Array.isArray(this.props.contents)) {
            return null;
        }
        var tabsProps = {
            'renderTabBar'          : () => 
                <ScrollableInkTabBar
                    onTabClick={this.props.onTabClick}
                    extraContent={this.props.extraTabContent}
                    className="extra-style-2"
                />,
            'renderTabContent'      : () => <TabContent animated={this.props.animated} />,
            'onChange'              : this.props.onChange,
            'destroyInactiveTabPane': this.props.destroyInactiveTabPane
        };
        if (this.props.activeKey) tabsProps.activeKey = this.props.activeKey;
        var defaultActiveTab = _.findWhere(this.props.contents, { 'isDefault' : true });
        if (typeof defaultActiveTab !== 'undefined' && typeof defaultActiveTab.key !== 'undefined'){
            tabsProps.defaultActiveKey = defaultActiveTab.key;
        }
        return (
            <Tabs {...tabsProps} >
                {
                    this.props.contents.map(function(t){
                        return (
                            <Tabs.TabPane
                                key={t.key || t.tab || t.title}
                                tab={<span className="tab">{ t.tab || t.title }</span>}
                                children={t.content}
                                placeholder={t.placeholder}
                                disabled={t.disabled}
                                style={t.style}
                            />
                        );
                    })
                }
            </Tabs>
        );
    }

}

TabView.defaultProps = {
    'contents' : [
        { tab : "Tab 1", content : <span>Test1</span> },
        { tab : "Tab 2", content : <span>Test2</span> }
    ],
    'animated' : false
}
