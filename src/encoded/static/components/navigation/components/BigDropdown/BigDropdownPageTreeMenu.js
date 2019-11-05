'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { CSSTransition } from 'react-transition-group';
import { layout, console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';


export function BigDropdownPageTreeMenuIntroduction(props) {
    const { menuTree, windowHeight, onMenuItemClick } = props;
    if (!menuTree || !menuTree.display_title || !menuTree.description || windowHeight < 800) return null;
    return (
        <div className="intro-section">
            <h4><a href={'/' + menuTree.name} onClick={onMenuItemClick}>{ menuTree.display_title }</a></h4>
            <div className="description">{ menuTree.description }</div>
        </div>
    );
}


export function BigDropdownPageTreeMenu(props) {
    const { menuTree, windowWidth, href, onMenuItemClick } = props;

    /*
    var mostChildrenHaveChildren = _.filter(helpMenuTree.children, function(c){
        return (c.children || []).length > 0;
    }).length >= parseInt(helpMenuTree.children.length / 2);
    */

    const urlParts = url.parse(href);

    function filterOutChildren(child){ // Ensure Item has view permission, title, and name (route/URL).
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

    let columnsPerRow;
    const rgs = layout.responsiveGridState(windowWidth);
    if (rgs === 'xs'){
        columnsPerRow = 1;
    } else if (rgs === 'md'){
        columnsPerRow = 2;
    } else { // md & greater
        columnsPerRow = 3;
    }

    const rowsOfLevel1Children = [];
    _.forEach(level1ChildrenToRender, function(child, i, all){
        const groupIdx = Math.floor(i / columnsPerRow);
        if (!Array.isArray(rowsOfLevel1Children[groupIdx])){
            rowsOfLevel1Children.push([]);
        }
        rowsOfLevel1Children[groupIdx].push(child);
    });


    return _.map(rowsOfLevel1Children, function(childrenInRow, rowIdx){
        const childrenInRowRendered = childrenInRow.map(function childColumnsRenderer(childLevel1){
            const level1Children = _.filter(childLevel1.children || [], filterOutChildren);
            const hasChildren = level1Children.length > 0;
            return (
                <div className={"help-menu-tree level-1 col-12 col-md-6 col-lg-4" + (hasChildren ? ' has-children' : '')} key={childLevel1.name}>
                    <div className="level-1-title-container">
                        <a className="level-1-title text-medium" href={'/' + childLevel1.name} data-tip={childLevel1.description}
                            data-delay-show={1000} onClick={onMenuItemClick} id={"menutree-linkto-" + childLevel1.name.replace(/\//g, '_')} >
                            { childLevel1.display_title }
                        </a>
                    </div>
                    { hasChildren ?
                        level1Children.map(function(childLevel2){
                            return (
                                <a className={"level-2-title text-small" + (urlParts.pathname.indexOf(childLevel2.name) > -1 ? ' active' : '')}
                                    href={'/' + childLevel2.name} data-tip={childLevel2.description} data-delay-show={1000}
                                    key={childLevel2.name} onClick={onMenuItemClick} id={"menutree-linkto-" + childLevel2.name.replace(/\//g, '_')}>
                                    { childLevel2.display_title }
                                </a>
                            );
                        })
                        : null }
                </div>
            );
        });
        return <div className="row help-menu-row" key={rowIdx}>{ childrenInRowRendered }</div>;
    });
}
