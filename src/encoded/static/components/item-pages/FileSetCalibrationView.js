'use strict';

import React from 'react';
import _ from 'underscore';
import * as globals from './../globals';
import { ItemHeader, ItemPageTitle, PartialList, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow } from './components';


/**
 * Page view for a FileSetCalibration Item.
 * Renders out a {@link module:item-pages/components.FilesInSetTable} Component.
 * 
 * @module {Component} item-pages/file-set-calibration-view
 */

export default class FileSetCalibrationView extends React.Component {

    render(){
        var context = this.props.context || null;
        var schemas = this.props.schemas || null;

        var itemClass = globals.itemClass(context, 'view-detail item-page-container');
        var title = globals.listing_titles.lookup(context)({'context': context});

        return (
            <div className={itemClass}>

                <ItemPageTitle context={context} schemas={schemas} />

                <ItemHeader.Wrapper context={context} className="exp-set-header-area" href={this.props.href} schemas={schemas}>
                    <ItemHeader.TopRow />
                    <ItemHeader.MiddleRow />
                    <ItemHeader.BottomRow />
                </ItemHeader.Wrapper>

                <div className="row">

                    <div className="col-xs-12 col-md-12">

                        <h4 className="files-in-set-table-title">Files in Set</h4>

                        {
                            Array.isArray(context.files_in_set) ?
                            <div>
                                <FilesInSetTable files={context.files_in_set}/>
                            </div>
                            :
                            <div>
                                <h5 className="text-400 text-center"><em>No files in this set</em></h5>
                            </div>
                        }

                    </div>


                </div>

                <ItemFooterRow context={context} schemas={schemas} />


            </div>
        );
    }

}

globals.panel_views.register(FileSetCalibrationView, 'FileSetCalibration');
