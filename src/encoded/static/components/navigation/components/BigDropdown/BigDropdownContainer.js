'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { CSSTransition } from 'react-transition-group';
import ReactTooltip from 'react-tooltip';
import { layout, console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { elementIsChildOfLink } from './../../../globals';


export class BigDropdownContainer extends React.PureComponent {

    static defaultProps = {
        'windowHeight' : 500,
        'children' : <h5>HI!</h5>,
        'introSection' : <h4>Hello World!</h4>
    };

    constructor(props){
        super(props);
        this.onBackgroundClick = this.onBackgroundClick.bind(this);
    }

    componentDidUpdate(pastProps){
        const { id, open } = this.props;
        const { open: pastOpen } = pastProps;

        // if (href !== pastHref){
        //     // Navigated away. Should already be closed via BigDropdownGroupController onWindowClick.
        //     // onClose();
        //     return;
        // }

        if (open && !pastOpen) {
            // Need to regenerate tooltips as current dropdown elem w. `data-tooltip` wasn't present on init build.
            ReactTooltip.rebuild();

            // Set focus to first focusable elem for accessibility.
            setTimeout(()=>{
                const containerSelectorStr = `.big-dropdown-menu[data-open-id=${id}]`;
                const firstFocusableElem = document.querySelector(containerSelectorStr + " a, " + containerSelectorStr + " input");
                if (firstFocusableElem) {
                    firstFocusableElem.focus();
                }
            }, 250);
        }
    }

    /**
     * Close dropdown on click on semi-opaque background only (not menu items, etc.)
     *
     * Conditionally prevent click event from bubbling up past this background.
     * Makes it easier in BigDropdownGroupController to close dropdown on any click in window (outside of menu).
     */
    onBackgroundClick(evt){
        const targetElem = (evt && evt.target) || null;

        if (elementIsChildOfLink(targetElem)){
            // Let bubble up - app.js will catch and navigate via handleClick and BigDropdownGroupController will catch and hide menu.
            return false;
        }

        const targetElemCls = (targetElem && targetElem.className) || null;
        const targetElemClassList = (targetElemCls && targetElemCls.split(' ')) || null;

        if (Array.isArray(targetElemClassList) && targetElemClassList.indexOf("big-dropdown-menu-background") > -1){
            // Clicked on semi-opaque background - close.
            // Let click event bubble up to be caught by BigDropdownGroupController window click handler and dropdown closed.
            return false;
        }

        // Else is presumed click on bg div pane but not on a link - _prevent_ event bubbling & transitive closing of menu
        evt.stopPropagation();
        evt.preventDefault();
    }

    render(){
        const {
            children,
            id,
            scrolledPastTop,
            testWarning,
            open,
            overlaysContainer = null,
            className,
            closing,
            isDesktopView = true,
            testWarningVisible = false,
            otherDropdownOpen = false,
            otherDropdownClosing = false,
            onClose,
            ...passProps
        } = this.props;

        const outerCls = "big-dropdown-menu-background" + (className ? ' ' + className : "");
        const innerCls = "big-dropdown-menu" + (open ? " is-open" : "");
        const body = React.Children.map(children, (child) => React.cloneElement(child, passProps));
        const renderedElem = (
            <CSSTransition appear in={open || closing} classNames="big-dropdown-menu-transition" unmountOnExit mountOnEnter
                timeout={{ appear: 0, exit: otherDropdownOpen ? 0 : 300 }} key="dropdown-transition-container">
                <div className={outerCls} onClick={this.onBackgroundClick} key="dropdown-transition-container-inner"
                    data-is-mobile-view={!isDesktopView}
                    data-is-test-warning-visible={testWarningVisible}
                    data-is-closing={closing}
                    data-is-other-dropdown-closing={otherDropdownClosing}>
                    <div className={innerCls} data-open-id={id}>
                        <div className="container">
                            { body }
                            <div className="mobile-close-button" onClick={onClose}>
                                <i className="icon icon-2x icon-times fas"/>
                            </div>
                        </div>
                    </div>
                </div>
            </CSSTransition>
        );

        if (overlaysContainer){
            return ReactDOM.createPortal(renderedElem, overlaysContainer);
        }

        return renderedElem;
    }

}
