'use strict';

import React from 'react';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { BigDropdownPageLoader, BigDropdownPageTreeMenu, BigDropdownPageTreeMenuIntroduction, BigDropdownNavItem } from './BigDropdown';


export function HelpNavItem(props){
    const {
        href, session,
        id = "help",
        windowWidth,
        windowHeight,
        overlaysContainer,
        isFullscreen = false,
        testWarning = false,
        mounted = false
    } = props;

    const navItemProps = {
        href, session, id, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer
    };

    return (
        <BigDropdownPageLoader treeURL="/pages/311d0f4f-56ee-4450-8cbb-780c10229284/@@embedded">
            <BigDropdownNavItem {...navItemProps} navItemHref="/help/" navItemContent="Help">
                <BigDropdownPageTreeMenuIntroduction />
                <BigDropdownPageTreeMenu />
            </BigDropdownNavItem>
        </BigDropdownPageLoader>
    );
}
