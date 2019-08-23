'use strict';

import React from 'react';
import _ from 'underscore';
import { FilesInSetTable } from './components/FilesInSetTable';
import DefaultItemView from './DefaultItemView';


/**
 * Page view for a FileSetCalibration Item.
 * Renders out a {@link module:item-pages/components.FilesInSetTable} Component.
 *
 * @module {Component} item-pages/file-set-calibration-view
 */

export default class FileSetCalibrationView extends DefaultItemView {

    getTabViewContents(){

        var initTabs = [];
        if (Array.isArray(this.props.context.files_in_set)){
            initTabs.push(FilesInSetTable.getTabObject(this.props.context));
        }

        return initTabs.concat(_.filter(this.getCommonTabs(), function(tabObj){
            if (tabObj.key === 'details') return false;
            return true;
        }));
    }

}
