import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { patchedConsoleInstance as console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/patched-console';
import { FileDownloadButtonAuto as FileDownloadButtonAutoOriginal } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/FileDownloadButton';

import { File } from './typedefs';



/** For FileMicroscropy files. */
export function getLightSourceCenterMicroscopeSettingFromFile(channel, fileItem){
    if (typeof channel !== 'string' || channel.slice(0,2) !== 'ch' || !fileItem) return null;
    return fileItem.microscope_settings && fileItem.microscope_settings[channel + '_light_source_center_wl'];
}



/**
 * Extends file (creates a copy) with properties:
 * `{ from_experiment : { from_experiment_set : { accession }, accession }, from_experiment_set : { accession }`
 *
 */
export function extendFile(file, experiment, experimentSet){
    return _.extend(
        {}, file, {
            'from_experiment' : _.extend(
                {}, experiment, { 'from_experiment_set' : experimentSet }
            ),
            'from_experiment_set' : experimentSet
        }
    );
}


/**************************
 ** Common React Classes **
 ************************/

/** Uses different defaultProps.canDownloadStatuses, specific to project */
export function FileDownloadButtonAuto(props){
    return <FileDownloadButtonAutoOriginal {...props} />;
}
FileDownloadButtonAuto.defaultProps = {
    'canDownloadStatuses' : [
        'uploaded',
        'pre-release',
        'released',
        'replaced',
        'submission in progress',
        'released to project',
        'archived'
    ]
};
