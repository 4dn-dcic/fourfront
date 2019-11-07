'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { CSSTransition } from 'react-transition-group';
import ReactTooltip from 'react-tooltip';
import { layout, console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';


export class BigDropdownContainer extends React.PureComponent {

    // TODO: Check openDropdownID vs ___MenuTree presence.

    static defaultProps = {
        'windowHeight' : 500,
        'children' : <h5>HI!</h5>,
        'introSection' : <h4>Hello World!</h4>
    };

    componentDidUpdate(pastProps){
        const { href, windowWidth, open, onClose } = this.props;
        const { open: pastOpen, href: pastHref, windowWidth: pastWindowWidth } = pastProps;
        if (href !== pastHref){
            onClose();
            return;
        }

        if (open && !pastOpen) {
            ReactTooltip.rebuild();
        }
        // Seems CSSTransition might reset on resizes to mobile (need to look into, likely re: `key` or something)
        // So for now we just close menu if changed grid breakpoint size.
        /*
        if (open && windowWidth !== pastWindowWidth){
            const rgs = layout.responsiveGridState(windowWidth);
            const pastRgs = layout.responsiveGridState(pastWindowWidth);
            if (rgs !== pastRgs) {
                //this.onStartClose();
            }
        }
        */
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
        const childProps = { ...passProps, onMenuItemClick: onClose };
        const body = React.Children.map(children, (child) => React.cloneElement(child, childProps));
        const renderedElem = (
            <CSSTransition appear in={open || closing} classNames="big-dropdown-menu-transition" unmountOnExit mountOnEnter
                timeout={{ appear: 0, exit: otherDropdownOpen ? 0 : 300 }} key="dropdown-transition-container">
                <div className={outerCls} onClick={onClose} key="dropdown-transition-container-inner"
                    data-is-mobile-view={!isDesktopView}
                    data-is-test-warning-visible={testWarningVisible}
                    data-is-closing={closing}
                    data-is-other-dropdown-closing={otherDropdownClosing}>
                    <div className={innerCls} data-open-id={id}>
                        <div className="container">
                            { body }
                            <div className="mobile-close-button d-block d-md-none" onClick={onClose}>
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
