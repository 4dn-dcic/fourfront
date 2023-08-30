import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { onLoginNavItemClick } from './../navigation/components/LoginNavItem';
import { event, eventObjectFromCtx, transformItemsToProducts, getStringifiedCurrentFilters } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/analytics';
import { patchedConsoleInstance as console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/patched-console';
import { FileDownloadButtonAuto as FileDownloadButtonAutoOriginal } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/FileDownloadButton';

import { File } from './typedefs';



/**
 * Generate analytics "add product to cart" event.
 * We don't create an actual "download file" event here
 * because this is done server-side. (instead we use add_payment_info that
 * is the final step just before the purchase in GA4.)
 *
 * `context` and `fileItem` are likely to be same unless is
 * detailpane on another page showing file info.
 */
export function downloadFileButtonClick(fileItem, context = null){
    setTimeout(function(){
        //analytics
        const products = transformItemsToProducts(fileItem, {});
        const parameters = {
            items: Array.isArray(products) ? products : null,
            value: !isNaN(fileItem.file_size) ? fileItem.file_size : 0,
            filters: getStringifiedCurrentFilters((context && context.filters) || null),
            payment_type: 'File Download'
        };
        // add_to_cart-begin_checkout-add_payment_info conversions
        event("add_to_cart", "FileDownloadButton", "Click", null, parameters, false);
        event("begin_checkout", "FileDownloadButton", "Select", null, parameters, false);
        event("add_payment_info", "FileDownloadButton", "Download", null, parameters, false);
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
    const { result, context = null, session = false } = props;
    const onClick = useMemo(function(){
        return function(evt){
            if (session){
                return downloadFileButtonClick(result, context);
            } else {
                return onLoginNavItemClick(evt);
            }
        };
    }, [result, context, session]);
    const tooltip = !session ? 'Log in or create an account to download this file' : null;
    return <FileDownloadButtonAutoOriginal {...props} onClick={onClick} tooltip={tooltip} />;
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
