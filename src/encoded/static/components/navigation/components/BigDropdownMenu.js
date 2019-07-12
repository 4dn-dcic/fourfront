'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { layout, console } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';

export class BigDropdownMenu extends React.PureComponent {

    // TODO: Check openDropdownID vs ___MenuTree presence.

    static defaultProps = {
        'windowHeight' : 500
    };

    constructor(props){
        super(props);
        this.handleMenuItemClick = this.handleMenuItemClick.bind(this);
        this.renderMenuItems = this.renderMenuItems.bind(this);
    }


    handleMenuItemClick(e){
        if (!e.metaKey){
            setTimeout(this.props.setOpenDropdownID.bind(this.props.setOpenDropdownID, null), 100);
        }
        // TODO: Google Analytics Hook-In
    }

    renderMenuItems(){
        const { openDropdownID, menuTree, windowWidth, href, setOpenDropdownID } = this.props;
        const handleMenuItemClick = this.handleMenuItemClick;
        /*
        var mostChildrenHaveChildren = _.filter(helpMenuTree.children, function(c){
            return (c.children || []).length > 0;
        }).length >= parseInt(helpMenuTree.children.length / 2);
        */

        const urlParts = url.parse(href);

        function filterOutChildren(child){
            return !child.error && child.display_title && child.name;
        }

        const level1ChildrenToRender = _.filter(menuTree.children, function(child){
            const childValid = filterOutChildren(child);
            if (!childValid) return false;
            if ((child.content || []).length > 0) return true;
            if ((child.children || []).length === 0) return false;
            const filteredChildren = _.filter(child.children || [], filterOutChildren);
            if (filteredChildren.length > 0) return true;
            return false;
        });

        function childColumnsRenderer(childLevel1){
            var level1Children = _.filter(childLevel1.children || [], filterOutChildren);
            var hasChildren = level1Children.length > 0;
            return (
                <div className={"help-menu-tree level-1 col-12 col-md-6 col-lg-4" + (hasChildren ? ' has-children' : '')} key={childLevel1.name}>
                    <div className="level-1-title-container">
                        <a className="level-1-title text-medium" href={'/' + childLevel1.name} data-tip={childLevel1.description}
                            data-delay-show={1000} onClick={handleMenuItemClick} id={"menutree-linkto-" + childLevel1.name.replace(/\//g, '_')} >
                            { childLevel1.display_title }
                        </a>
                    </div>
                    { hasChildren ?
                        _.map(level1Children, function(childLevel2){
                            return (
                                <a className={"level-2-title text-small" + (urlParts.pathname.indexOf(childLevel2.name) > -1 ? ' active' : '')}
                                    href={'/' + childLevel2.name} data-tip={childLevel2.description} data-delay-show={1000}
                                    key={childLevel2.name} onClick={handleMenuItemClick} id={"menutree-linkto-" + childLevel2.name.replace(/\//g, '_')}>
                                    { childLevel2.display_title }
                                </a>
                            );
                        })
                        : null }
                </div>
            );
        }

        let columnsPerRow;
        const rgs = layout.responsiveGridState(windowWidth);
        if (rgs === 'xs'){
            columnsPerRow = 1;
        } else if (rgs === 'md'){
            columnsPerRow = 2;
        } else { // md & greater
            columnsPerRow = 3;
        }


        var rowsOfLevel1Children = [];
        _.forEach(level1ChildrenToRender, function(child, i, all){
            var groupIdx = parseInt(i / columnsPerRow);
            if (!Array.isArray(rowsOfLevel1Children[groupIdx])) rowsOfLevel1Children.push([]);
            rowsOfLevel1Children[groupIdx].push(child);
        });

        return _.map(rowsOfLevel1Children, function(childrenInRow, rowIdx){
            return <div className="row help-menu-row" key={rowIdx} children={_.map(childrenInRow, childColumnsRenderer)}/>;
        });
    }

    introSection(){
        var { menuTree, windowHeight } = this.props;
        if (!menuTree || !menuTree.display_title || !menuTree.description || windowHeight < 800) return null;
        return (
            <div className="intro-section">
                <h4><a href={'/' + menuTree.name} onClick={this.handleMenuItemClick}>{ menuTree.display_title }</a></h4>
                <div className="description">{ menuTree.description }</div>
            </div>
        );
    }

    render(){
        var { openDropdownID, windowWidth, windowHeight, scrolledPastTop, testWarning } = this.props;
        var outerStyle = null;
        if (windowWidth >= 992){
            outerStyle = { 'maxHeight' : windowHeight - (scrolledPastTop ? 40 : 80) - (testWarning ? 52 : 0) };
        }
        return (
            <div className={"big-dropdown-menu" + (openDropdownID ? ' is-open' : '')} data-open-id={openDropdownID} style={outerStyle}>
                <div className="container">
                    { this.introSection() }
                    { this.renderMenuItems() }
                </div>
            </div>
        );
    }

}
