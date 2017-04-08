'use strict';

var React = require('react');
var globals = require('./../globals');
var _ = require('underscore');
var { ItemPageTitle, ItemHeader, ItemDetailList, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow } = require('./components');
var { AuditIndicators, AuditDetail, AuditMixin } = require('./../audit');
var { console, object, DateUtility, Filters } = require('./../util');

/**
 * This Component renders out the default Item page view for Item objects/contexts which do not have a more specific
 * Item page template associated with them.
 *
 * @module {Component} item-pages/item-view
 */


/**
 * @alias module:item-pages/item-view
 */
var ItemView = module.exports = React.createClass({

    /**
     * @memberof module:item-pages/item-view
     * @private
     * @instance
     * @returns {Object} collapsed : false
     */
    getInitialState : function(){
        return {
            'collapsed' : true
        };
    },

    /** @ignore */
    componentDidMount : function(){
        FormattedInfoBlock.onMountMaybeFetch.call(this, 'lab', this.props.context.lab);
        FormattedInfoBlock.onMountMaybeFetch.call(this, 'award', this.props.context.award);
        FormattedInfoBlock.onMountMaybeFetch.call(this, 'submitted_by', this.props.context.submitted_by);
    },

    /** @ignore */
    topRightHeaderSection : function(){
        var r = [];
        // TODO: EDIT ACTIONS
        return r;
    },

    /** @ignore */
    render: function() {
        var schemas = this.props.schemas || {};
        var context = this.props.context;
        var itemClass = globals.itemClass(this.props.context, 'view-detail item-page-container');

        return (
            <div className={itemClass}>

                <ItemPageTitle context={context} />
                <ItemHeader.Wrapper context={context} className="exp-set-header-area" href={this.props.href} schemas={this.props.schemas}>
                    <ItemHeader.TopRow>{ this.topRightHeaderSection() || null }</ItemHeader.TopRow>
                    <ItemHeader.MiddleRow />
                    <ItemHeader.BottomRow />
                </ItemHeader.Wrapper>

                <div className="row">

                    <div className="col-xs-12 col-md-8">

                        <hr/>

                        <ItemDetailList context={context} schemas={schemas} />

                    </div>


                    <div className="col-xs-12 col-md-4 item-info-area section">

                        { typeof context.lab !== 'undefined' || typeof context.award !== 'undefined' ?
                        <hr/>
                        : null }

                        { typeof context.submitted_by !== 'undefined' ?
                        <div>
                            { FormattedInfoBlock.User(
                                this.state && typeof this.state.details_submitted_by !== 'undefined' ?
                                this.state.details_submitted_by : context.submitted_by
                            ) }
                        </div>
                        : null }

                        { typeof context.lab !== 'undefined' ? <hr/> : null }
                        { typeof context.lab !== 'undefined' ?
                        <div className>
                            { FormattedInfoBlock.Lab(
                                this.state && typeof this.state.details_lab !== 'undefined' ?
                                this.state.details_lab : context.lab
                            ) }
                        </div>
                        : null }

                        { typeof context.award !== 'undefined' ? <hr/> : null }
                        { typeof context.award !== 'undefined' ?
                        <div className>
                            { FormattedInfoBlock.Award(
                                this.state && typeof this.state.details_award !== 'undefined' ?
                                this.state.details_award : context.award
                            ) }
                        </div>
                        : null }

                    </div>

                </div>

                <ItemFooterRow context={context} schemas={schemas} />

            </div>
        );
    }
});


globals.panel_views.register(ItemView, 'Item');
