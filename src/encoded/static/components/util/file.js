import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { productsAddToCart, productsCheckout, event, eventObjectFromCtx } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/analytics';
import { patchedConsoleInstance as console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/patched-console';
import { FileDownloadButtonAuto as FileDownloadButtonAutoOriginal } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/FileDownloadButton';

import { File } from './typedefs';



/**
 * Generate analytics "add product to cart" event.
 * We don't create an actual "download file" event here
 * because this is done server-side.
 *
 * `context` and `fileItem` are likely to be same unless is
 * detailpane on another page showing file info.
 */
export function downloadFileButtonClick(fileItem, context = null){
    setTimeout(function(){
        const evtObj = eventObjectFromCtx(context);
        if (!isNaN(fileItem.file_size)){
            evtObj.eventValue = fileItem.file_size;
        }
        evtObj.eventLabel = eventObjectFromCtx(fileItem).name;
        // Need 2 sep. events here else will be 2x checkouts.
        productsAddToCart(fileItem);
        event("FileDownloadButton", "Added Item to 'Cart'", evtObj, false);
        productsCheckout(fileItem, { step: 1, option: "File Download Button" });
        event("FileDownloadButton", "Clicked", evtObj, false);
    }, 0);
}



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
    const { result, context = null } = props;
    const onClick = useMemo(function(){
        return function(evt){
            return downloadFileButtonClick(result, context);
        };
    }, [result, context]);
    return <FileDownloadButtonAutoOriginal {...props} onClick={onClick} />;
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
