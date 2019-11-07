'use strict';

import React from 'react';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';


export function BigDropdownIntroductionWrapper(props){
    const { children, titleIcon = null, windowHeight, windowWidth, className, isActive = false } = props;
    if (!children || windowHeight < 800) return null;

    const textCol = (
        <div className="col">
            { children }
        </div>
    );

    let iconCol = null;

    if (typeof titleIcon === "string") {
        iconCol = (
            <div className="col-auto icon-beside-column text-right">
                <i className={"icon icon-fw icon-2x icon-" + titleIcon}/>
            </div>
        );
    } else if (React.isValidElement(titleIcon)){
        iconCol = (
            <div className="col-auto icon-beside-column text-right">
                { titleIcon }
            </div>
        );
    }

    return (
        <div className={"intro-section" + (className? " " + className : "") + (isActive? " active" : "")}>
            <div className="row align-items-center">
                { iconCol }
                { textCol }
            </div>
        </div>
    );
}
