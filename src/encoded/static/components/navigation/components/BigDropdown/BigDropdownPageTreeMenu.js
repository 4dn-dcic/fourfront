'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { BigDropdownIntroductionWrapper } from './BigDropdownIntroductionWrapper';
import { memoizedUrlParse } from './../../../globals';

export function BigDropdownPageTreeMenuIntroduction(props) {
    const { menuTree, windowHeight, windowWidth, titleIcon = null, isActive = false } = props;
    const { display_title, name: pathName, description } = menuTree || {};

    if (!menuTree || !menuTree.display_title || windowHeight < 600) {
        // Hide this link to top-level page on smaller heights.
        // TODO: Reconsider and maybe remove this; works currently for /help and /resources since they serve
        // as "directory" pages without much useful content themselves.
        return null;
    }

    return (
        <BigDropdownIntroductionWrapper {...{ windowHeight, windowWidth, titleIcon, isActive }}>
            <h4 className="mt-0 mb-0">
                <a href={'/' + pathName}>{ display_title }</a>
            </h4>
            { description ? <div className="description">{ description }</div> : null }
        </BigDropdownIntroductionWrapper>
    );
}


export function BigDropdownPageTreeMenu(props) {
    const { menuTree, href } = props;
    const { display_title, name: pathName, children = [] } = menuTree || {};

    if (!pathName || !display_title) return null;

    /*
    var mostChildrenHaveChildren = _.filter(helpMenuTree.children, function(c){
        return (c.children || []).length > 0;
    }).length >= parseInt(helpMenuTree.children.length / 2);
    */

    const urlParts = memoizedUrlParse(href);

    function filterOutChildren(child){ // Ensure Item has view permission, title, and name (route/URL).
        return !child.error && child.display_title && child.name;
    }

    const level1ChildrenWithoutSubChildren = [];
    const level1ChildrenWithSubChildren = _.filter(children, function(child){
        const childValid = filterOutChildren(child);
        if (!childValid) return false;
        const filteredChildren = _.filter(child.children || [], filterOutChildren);
        if (filteredChildren.length > 0){
            return true;
        } else {
            if ((child.content || []).length > 0) {
                level1ChildrenWithoutSubChildren.push(child);
            }
            return false;
        }
    });

    const hasLevel2Children = level1ChildrenWithSubChildren.length > 0;
    let topLeftMenuCol = null;

    if (level1ChildrenWithoutSubChildren.length > 0){
        topLeftMenuCol = (
            <div key="reserved"
                className={"help-menu-tree level-1-no-child-links level-1 col-12" + (!hasLevel2Children? " col-lg-8" : " col-lg-4")}>
                { level1ChildrenWithoutSubChildren.map(function(child){
                    const active = (urlParts.pathname.indexOf(child.name) > -1 ? ' active' : '');
                    return (
                        <div className={"level-1-title-container" + (active? " active" : "")} key={child.name}>
                            <a className="level-1-title text-medium" href={'/' + child.name} data-tip={child.description}
                                data-delay-show={500} id={"menutree-linkto-" + child.name.replace(/\//g, '_')} >
                                <span>{ child.display_title }</span>
                            </a>
                        </div>
                    );
                }) }
            </div>
        );
    }

    const childItems = level1ChildrenWithSubChildren.map(function(childLevel1){
        const level1Children = _.filter(childLevel1.children || [], filterOutChildren);
        const hasChildren = level1Children.length > 0;
        const active = urlParts.pathname.indexOf(childLevel1.name) > -1;
        const outerCls = (
            "help-menu-tree level-1 col-12 col-md-6 col-lg-4" +
            (hasChildren ? ' has-children' : '')
        );
        return (
            <div className={outerCls} key={childLevel1.name}>
                <div className={"level-1-title-container" + (active ? " active" : "")}>
                    <a className="level-1-title text-medium" href={'/' + childLevel1.name} data-tip={childLevel1.description}
                        data-delay-show={500} id={"menutree-linkto-" + childLevel1.name.replace(/\//g, '_')} >
                        <span>{ childLevel1.display_title }</span>
                    </a>
                </div>
                { hasChildren ?
                    level1Children.map(function(childLevel2){
                        return (
                            <a className={"level-2-title text-small" + (urlParts.pathname.indexOf(childLevel2.name) > -1 ? ' active' : '')}
                                href={'/' + childLevel2.name} data-tip={childLevel2.description} data-delay-show={500}
                                key={childLevel2.name} id={"menutree-linkto-" + childLevel2.name.replace(/\//g, '_')}>
                                { childLevel2.display_title }
                            </a>
                        );
                    })
                    : null }
            </div>
        );
    });
    const childItemsLen = childItems.length;
    const cls = (
        "tree-menu-container row" +
        (!hasLevel2Children ? " no-level-2-children" : "") +
        (!topLeftMenuCol ? "" : (childItemsLen < 3 ? "" : ((childItemsLen + 1) % 3 === 1 ? " justify-content-lg-center" : " justify-content-lg-end")))
    );

    return (
        <div className={cls}>
            { topLeftMenuCol }
            { childItems }
        </div>
    );
}
