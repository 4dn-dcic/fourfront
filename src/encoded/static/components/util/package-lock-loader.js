'use strict';

import React, { useEffect, useState } from 'react';

let loadedPackageLockJson = null;

/**
 * This loads & caches the package-lock.json file as a separate file since it takes up some non-trivial size
 */
export function PackageLockLoader({ children }){
    const [ isLoaded, setLoaded ] = useState(!!(loadedPackageLockJson));
    useEffect(function(){
        if (isLoaded) return;
        import(
            /* webpackChunkName: "package-lock-json" */
            'package-lock.json'
        ).then(({ default: packageLockJson }) =>{
            loadedPackageLockJson = packageLockJson;
            setLoaded(true);
        });
    }, []); // Runs once upon mount only.

    const childProps = { "packageLockJson": loadedPackageLockJson };
    return React.Children.map(children, function(c){
        return React.cloneElement(c, childProps);
    });

}
