'use strict';

var React = require('react');
var _ = require('underscore');
var globals = require('./../globals');
var { ItemHeader, PartialList, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow } = require('./components');

// TODO: Rename to FileSetCalibrationView?

var FileSetCalibrationView = module.exports = React.createClass({

    render : function(){
        var context = this.props.context || null;
        var schemas = this.props.schemas || null;

        var itemClass = globals.itemClass(context, 'view-detail item-page-container');
        var title = globals.listing_titles.lookup(context)({'context': context});

        return (
            <div className={itemClass}>

                <h1 className="page-title">
                    {context['@type'][0]} <span className="subtitle prominent">{ title }</span>
                </h1>

                <ItemHeader.Wrapper context={context} className="exp-set-header-area" href={this.props.href}>
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

});

globals.panel_views.register(FileSetCalibrationView, 'FileSetCalibration');