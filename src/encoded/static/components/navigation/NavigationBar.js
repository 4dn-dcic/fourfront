'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { console, ajax, layout } from './../util';
import { CGAPLogo } from './../viz/CGAPLogo';
import { DropdownItem, DropdownButton, Dropdown } from './../forms/components/DropdownButton';
import { SearchBar, TestWarning, HelpNavItem, BigDropdownMenu, UserActionDropdownMenu, isActionActive, getActionURL } from './components';
import QuickInfoBar from './../viz/QuickInfoBar';


export class NavigationBar extends React.PureComponent {

    static propTypes = {
        'href'              : PropTypes.string,
        'session'           : PropTypes.bool,
        'listActionsFor'    : PropTypes.func,
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

                        <ul className="nav navbar-nav navbar-right">
                            <li><a href="#">Link</a></li>
                            <li className="dropdown">
                                {/*
                                <DropdownButton title="Test21e3" className="nav-dropdown-btn">
                                    <DropdownItem>
                                        Test
                                    </DropdownItem>
                                    <DropdownItem>
                                        Test
                                    </DropdownItem>
                                    <DropdownItem>
                                        Test
                                    </DropdownItem>
                                </DropdownButton>
                                */}
                                <Dropdown title="Test21e3" className="nav-dropdown-btn">
                                    <Dropdown.Toggle>
                                        Test2
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        <DropdownItem>
                                            Test
                                        </DropdownItem>
                                        <DropdownItem>
                                            Test
                                        </DropdownItem>
                                        <DropdownItem>
                                            Test
                                        </DropdownItem>
                                    </Dropdown.Menu>
                                </Dropdown>
                                {/*
                                <a href="#" className="dropdown-toggle" data-toggle="dropdown">Dropdown <b className="caret"></b></a>
                                <ul className="dropdown-menu">
                                    <li><a href="#">Action</a></li>
                                    <li><a href="#">Another action</a></li>
                                    <li><a href="#">Something else here</a></li>
                                    <li className="divider"></li>
                                    <li><a href="#">Separated link</a></li>
                                </ul>
                                */}
                            </li>
                        </ul>

                    </div>
                </nav>
            </div>
        );

    }

}