'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { CSSTransition } from 'react-transition-group';
import { layout, console } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';

/** @todo make more reusable? */
export class BigDropdownMenu extends React.PureComponent {

    // TODO: Check openDropdownID vs ___MenuTree presence.

    static defaultProps = {
        'windowHeight' : 500
    };

    constructor(props){
        super(props);
        this.onMenuItemClick = _.throttle(this.onMenuItemClick.bind(this), 400);
        this.onFinishTransitionOut = this.onFinishTransitionOut.bind(this);
        this.renderMenuItems = this.renderMenuItems.bind(this);
        this.state = { 'closing' : false };
    }

    componentDidUpdate(pastProps){
        const { href } = this.props;
        if (href !== pastProps.href){
            this.onMenuItemClick();
        }
    }

    onMenuItemClick(e){
        if (!e || !e.metaKey){
            this.setState(function({ closing }){
                if (closing) return null;
                return { 'closing' : true };
            });
        }
        // TODO: Google Analytics Hook-In
    }

    renderMenuItems(){
        const { menuTree, windowWidth, href } = this.props;
        const onMenuItemClick = this.onMenuItemClick;
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
                            data-delay-show={1000} onClick={onMenuItemClick} id={"menutree-linkto-" + childLevel1.name.replace(/\//g, '_')} >
                            { childLevel1.display_title }
                        </a>
                    </div>
                    { hasChildren ?
                        _.map(level1Children, function(childLevel2){
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

    onFinishTransitionOut(nodeElement){
        const { onClose } = this.props;
        this.setState({ 'closing' : false }, function(){
            onClose(null, false);
        });
    }

    introSection(){
        var { menuTree, windowHeight } = this.props;
        if (!menuTree || !menuTree.display_title || !menuTree.description || windowHeight < 800) return null;
        return (
            <div className="intro-section">
                <h4><a href={'/' + menuTree.name} onClick={this.onMenuItemClick}>{ menuTree.display_title }</a></h4>
                <div className="description">{ menuTree.description }</div>
            </div>
        );
    }

    render(){
        const { closing } = this.state;
        const { id, windowWidth, windowHeight, scrolledPastTop, testWarning, open, overlaysContainer, className } = this.props;
        let outerStyle = null;
        if (windowWidth >= 992){
            outerStyle = { 'maxHeight' : windowHeight - (scrolledPastTop ? 40 : 80) - (testWarning ? 52 : 0) };
        }
        const cls = "big-dropdown-menu-background" + (className ? ' ' + className : "");

        return ReactDOM.createPortal(
            <CSSTransition appear in={open && !closing} classNames="big-dropdown-menu-transition" unmountOnExit
                timeout={{ appear: 0, exit: 250 }} key={id} onExited={this.onFinishTransitionOut}>
                <div className={cls} onClick={this.onMenuItemClick}>
                    <div className={"big-dropdown-menu" + (open ? ' is-open' : '')} data-open-id={id} style={outerStyle}>
                        <div className="container">
                            { this.introSection() }
                            { this.renderMenuItems() }
                        </div>
                    </div>
                </div>
            </CSSTransition>,
            overlaysContainer
        );
    }

}
