'use strict';

/** This file should be loaded via `import()` to be code-split into separate bundle. */

import { HiGlassComponent } from 'higlass/dist/hglib';
// import from just 'higlass-register' itself don't work, should update its package.json to have `"module": "src/index.js",` (or 'esm' or w/e it is) for that.
import { default as higlassRegister } from 'higlass-register/dist/higlass-register';
import { default as StackedBarTrack } from 'higlass-multivec/es/StackedBarTrack';

export {
    HiGlassComponent,
    higlassRegister,
    StackedBarTrack
};
