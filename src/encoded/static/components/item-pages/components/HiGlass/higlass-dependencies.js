'use strict';

/** This file should be loaded via `import()` to be code-split into separate bundle. */

import { HiGlassComponent } from 'higlass/dist/hglib';
// import from just 'higlass-register' itself don't work, should update its package.json to have `"module": "src/index.js",` (or 'esm' or w/e it is) for that.
import { default as higlassRegister } from 'higlass-register/dist/higlass-register';
import { default as StackedBarTrack } from 'higlass-multivec/es/StackedBarTrack';
import { default as TranscriptsTrack } from 'higlass-transcripts/es/TranscriptsTrack';
import { default as TextTrack } from 'higlass-text/es/TextTrack';
import { default as OrthologsTrack } from 'higlass-orthologs/es/OrthologsTrack';
import { default as PileupTrack } from 'higlass-pileup/es/PileupTrack';
import { default as GnomadTrack } from 'higlass-gnomad/es/GnomadTrack';
import { default as SequenceTrack } from 'higlass-sequence/es/SequenceTrack';
import { default as ClinvarTrack } from 'higlass-clinvar/es/ClinvarTrack';

export {
    HiGlassComponent,
    higlassRegister,
    StackedBarTrack,
    SequenceTrack,
    TranscriptsTrack,
    ClinvarTrack,
    TextTrack,
    OrthologsTrack,
    PileupTrack,
    GnomadTrack
};
