'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { console, layout } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { CGAPLogo } from './../viz/CGAPLogo';

import { UserActionDropdownMenu } from './components/UserActionDropdownMenu';


export class NavigationBar extends React.PureComponent {

    static propTypes = {
        'href'              : PropTypes.string,
        'session'           : PropTypes.bool,
        'updateUserInfo'    : PropTypes.func.isRequired,
        'context'           : PropTypes.object,
        'schemas'           : PropTypes.any,
        'windowWidth'       : PropTypes.number
    };

    render(){
        const { windowWidth } = this.props;
        const rgs = layout.responsiveGridState(windowWidth);
        /*
        let outerCls;

        if (typeof windowWidth === 'number' && (rgs === 'md' || rgs === 'lg')){
            outerCls = " navbar-fixed-top";
        } else {
            outerCls = " navbar-static-top";
        }
        */

        return (
            <div className="navbar-fixed-top" role="navigation" id="top-nav">
                <nav className="navbar-main navbar navbar-light navbar-expand-lg">

                    <a className="navbar-brand" href="/">
                        <CGAPLogo/>
                    </a>

                    {/* TODO: Collect the nav links, forms, and other content for toggling */}
                    <div className="collapse navbar-collapse" id="navbar-contents">

                        <ul className="navbar-nav mr-auto">
                            <li className="nav-item active">
                                <a className="nav-link" href="#">Home <span className="sr-only">(current)</span></a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#">Link</a>
                            </li>
                            <li className="nav-item dropdown">
                                <a className="nav-link dropdown-toggle" href="#" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    Dropdown
                                </a>
                                <div className="dropdown-menu" aria-labelledby="navbarDropdown">
                                    <a className="dropdown-item" href="#">Action</a>
                                    <a className="dropdown-item" href="#">Another action</a>
                                    <div className="dropdown-divider"></div>
                                    <a className="dropdown-item" href="#">Something else here</a>
                                </div>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link disabled" href="#" tabIndex="-1" aria-disabled="true">Disabled</a>
                            </li>
                        </ul>

                        <UserActionDropdownMenu {...this.props} />

                    </div>
                </nav>
            </div>
        );

    }

}