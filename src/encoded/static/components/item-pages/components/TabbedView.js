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
        this.render = this.render.bind(this);
    }

    render(){
        var contents = this.props.contents;
        if (typeof contents === 'function') contents = contents();
        if (!Array.isArray(contents)) {
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
            'destroyInactiveTabPane': this.props.destroyInactiveTabPane,
            'ref' : 'tabs',
            'defaultActiveKey' : TabbedView.getDefaultActiveKeyFromContents(contents)
        };
        if (this.props.activeKey) tabsProps.activeKey = this.props.activeKey;
        return (
            <Tabs {...tabsProps} >
                {
                    contents.map(function(t){
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
