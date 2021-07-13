'use strict';

/** This file should be loaded via `import()` to be code-split into separate bundle. */

import { default as MicroMetaAppReact, AppVersion as microMetaAppVersion } from 'micro-meta-app-react';
import { validateMicroscope as validateMicroMetaMicroscope } from 'micro-meta-app-react/es/genericUtilities';

export {
    MicroMetaAppReact,
    microMetaAppVersion,
    validateMicroMetaMicroscope
};
