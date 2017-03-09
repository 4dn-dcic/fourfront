'use strict';

var React = require('react');
var _ = require('underscore');
var globals = require('./../globals');
var { ItemHeader, PartialList, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock } = require('./components');

// TODO: Rename to FileSetCalibrationView?

var FileSetCalibrationView = module.exports = React.createClass({

    render : function(){
        var itemClass = globals.itemClass(this.props.context, 'view-detail item-page-container');
        var title = globals.listing_titles.lookup(this.props.context)({context: this.props.context});
        
        return (
            <div className={itemClass}>

                <h1 className="page-title">
                    {this.props.context['@type'][0]} <span className="subtitle prominent">{ title }</span>
                </h1>

                <ItemHeader.Wrapper context={context} className="exp-set-header-area" href={this.props.href}>
                    <ItemHeader.TopRow>{ this.topRightHeaderSection() || null }</ItemHeader.TopRow>
                    <ItemHeader.MiddleRow />
                    <ItemHeader.BottomRow />
                </ItemHeader.Wrapper>

                <div className="row">

                    <div className="col-xs-12 col-md-8">

                        <hr/>

                        <h4>Hello WOrld</h4>

                    </div>


                </div>

                <div className="row">

                    { externalReferences ?
                    <div className="col-xs-12 col-md-4">
                        { externalReferences }
                    </div>
                    : null }

                    { aliases ?
                    <div className="col-xs-12 col-md-4">
                        { aliases }
                    </div>
                    : null }

                    { alternateAccessions ?
                    <div className="col-xs-12 col-md-4">
                        { alternateAccessions }
                    </div>
                    : null }

                </div>


            </div>
        );
    }

});

globals.panel_views.register(FileSetCalibrationView, 'FileSetCalibration');