'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import memoize from 'memoize-one';
import { NavItem, Nav } from 'react-bootstrap';
import { console, ajax, layout } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { BigDropdownMenu } from './BigDropdownMenu';

/**
 * Renders a Menu Item in NavBar for "Help".
 * Sends its `props.dropdownID` (or null, if === `props.openDropdownID`) to (function) `props.setOpenDropdownID` on click.
 *
 * To be used within a React-Bootstrap `<Nav>` section of a NavBar.
 */
export class HelpNavItem extends React.PureComponent {

    static defaultProps = {
        'id'                : 'help-menu-item',
        'dropdownID'        : 'help',
        'helpItemTreeURI'   : '/pages/311d0f4f-56ee-4450-8cbb-780c10229284/@@embedded',
        'helpItemHref'      : '/help',
        'mounted'           : false,
        'session'           : false,
        'isFullscreen'      : false,
        'testWarning'       : false
    };

    /** Relatively arbitrary point where wanna show/enable the big dropdown */
    static isDesktopView = memoize(function(windowWidth){
        return windowWidth > 768;
    });

    constructor(props){
        super(props);
        this.handleToggle = this.handleToggle.bind(this);
        this.onCloseDropdown = this.onCloseDropdown.bind(this);
        this.loadHelpMenuTree = this.loadHelpMenuTree.bind(this);
        this.dropdownID = props.dropdownID || props.id;

        this.state = {
            'helpMenuTree'          : null,
            'isLoadingHelpMenuTree' : false,
            'isDropdownVisible'     : false,
            'closingDropdown'       : false
        };
    }

    /**
     * Initializes scroll event handler & loading of help menu tree.
     *
     * @private
     * @returns {void}
     */
    componentDidMount(){
        const { helpMenuTree, isLoadingHelpMenuTree } = this.state;
        if (!helpMenuTree && !isLoadingHelpMenuTree){
            this.loadHelpMenuTree();
        }
    }

    componentDidUpdate(prevProps, prevState){
        const { session } = this.props;
        if (session !== prevProps.session){
            this.loadHelpMenuTree();
        }
    }

    /**
     * Performs AJAX request to `props.helpItemTreeURI` and saves response to
     * `state.helpMenuTree`. Manages `state.isLoadingHelpMenuTree` appropriately.
     */
    loadHelpMenuTree(){
        const { isLoadingHelpMenuTree } = this.state;
        const { helpItemTreeURI } = this.props;
        if (isLoadingHelpMenuTree) {
            console.error("Already loading Help tree");
            return;
        }
        this.setState({ 'isLoadingHelpMenuTree' : true }, ()=>{
            ajax.load(helpItemTreeURI, (res)=>{
                if (res && res.children){
                    this.setState({ 'helpMenuTree' : res, 'isLoadingHelpMenuTree' : false });
                } else {
                    this.setState({ 'helpMenuTree' : null, 'isLoadingHelpMenuTree' : false });
                }
            }, 'GET', ()=>{
                this.setState({ 'helpMenuTree' : null, 'isLoadingHelpMenuTree' : false });
            });
        });
    }

    onCloseDropdown(cb){
        this.setState(function({ isDropdownVisible }){
            if (!isDropdownVisible && !closingDropdown) return null;
            return { 'isDropdownVisible' : false, 'closingDropdown' : false };
        }, cb);
    }

    handleToggle(e){
        e && e.preventDefault();
        this.setState(function({ isDropdownVisible }){
            if (!isDropdownVisible){
                return { 'isDropdownVisible' : true };
            } else {
                // CSSTransition in BigDropdownMenu will transition out then call this.onCloseDropdown()
                return { 'closingDropdown' : true };
            }
        });
    }

    render(){
        const { mounted, href, helpItemHref, id, windowWidth, windowHeight, overlaysContainer, isFullscreen, testWarning } = this.props;
        const { helpMenuTree, isLoadingHelpMenuTree, isDropdownVisible, closingDropdown } = this.state;
        const active = href.indexOf(helpItemHref) > -1; // `helpItemHref` assumed to be /help/something.
        const commonProps = { id, active, 'key' : id, 'href': helpItemHref };
        const isDesktopView = HelpNavItem.isDesktopView(windowWidth);
        let cls = "id-" + id; // `id` is no longer pass as HTML attrib to[NavLink->]Dropdown so we add to className;

        if (!helpMenuTree || (helpMenuTree.children || []).length === 0 || !mounted || !isDesktopView || isLoadingHelpMenuTree){
            return <Nav.Link {...commonProps} className={cls}>Help</Nav.Link>;
        }

        cls += " dropdown-toggle" + (isDropdownVisible ? " dropdown-open-for" : "");

        const navItem = (
            <Nav.Link {...commonProps} onClick={this.handleToggle} className={cls}>
                Help
            </Nav.Link>
        );

        const inclBigMenu = helpMenuTree && isDropdownVisible && isDesktopView && (helpMenuTree.children || []).length > 0 && isDesktopView;

        if (!inclBigMenu){
            return navItem;
        } else {
            const testWarningVisible = testWarning & !isFullscreen;
            return (
                <React.Fragment>
                    { navItem }
                    <BigDropdownMenu {...{ windowWidth, windowHeight, href, overlaysContainer, id }} className={testWarningVisible ? 'test-warning-visible' : null}
                        onClose={this.onCloseDropdown} open={isDropdownVisible} menuTree={helpMenuTree} closing={closingDropdown} />
                </React.Fragment>
            );
        }

    }

}
