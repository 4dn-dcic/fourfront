'use strict';

import React from 'react';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

export function BigDropdownIntroductionWrapper(props){
    const { children, titleIcon = null, windowHeight, windowWidth, className } = props;
    if (!children || windowHeight < 800) return null;

    const textCol = (
        <div className="col">
            { children }
        </div>
    );

    let iconCol = null;

    if (typeof titleIcon === "string") {
        iconCol = (
            <div className="col-auto pr-0 text-right" style={windowWidth > 1600 ? { width: 60, marginLeft: -60 } : null}>
                <i className={"icon icon-fw icon-2x icon-" + titleIcon}/>
            </div>
        );
    } else if (React.isValidElement(titleIcon)){
        iconCol = (
            <div className="col-auto pr-0 text-right" style={windowWidth > 1600 ? { width: 60, marginLeft: -60 } : null}>
                { titleIcon }
            </div>
        );
    }

    return (
        <div className={"intro-section" + (className? " " + className : "")}>
            <div className="row align-items-center">
                { iconCol }
                { textCol }
            </div>
        </div>
    );
}
