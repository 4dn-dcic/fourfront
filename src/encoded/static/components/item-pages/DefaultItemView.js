'use strict';

var React = require('react');
var globals = require('./../globals');
var _ = require('underscore');
var { ItemPageTitle, ItemHeader, ItemDetailList, TabbedView, AuditView, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow } = require('./components');
var { AuditIndicators, AuditDetail, AuditMixin } = require('./../audit');
var { console, object, DateUtility, Filters } = require('./../util');

/**
 * This Component renders out the default Item page view for Item objects/contexts which do not have a more specific
 * Item page template associated with them.
 *
 * @module {Component} item-pages/DefaultItemView
 */


/**
 * @alias module:item-pages/DefaultItemView
 */
var DefaultItemView = module.exports = React.createClass({

    /**
     * @memberof module:item-pages/DefaultItemView
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

    getTabViewContents : function(){

        var auditIconClass = AuditView.getItemIndicatorIcon(this.props.context);

        return [
            {
                tab : <span><i className="icon icon-list-ul icon-fw"/> Details</span>,
                key : 'details',
                content : (
                    <div>
                        <h3 className="tab-section-title">
                            <span>Details</span>
                        </h3>
                        <hr className="tab-section-title-horiz-divider"/>
                        <ItemDetailList context={this.props.context} schemas={this.props.schemas} />
                    </div>
                )
            },
            {
                tab : (
                    <span className={this.props.context.audit && _.keys(this.props.context.audit).length ? 'active' : null}>
                        <i className={"icon icon-fw icon-" + auditIconClass}/> Audits
                    </span>
                ),
                key : "audits",
                disabled : !AuditView.doAnyAuditsExist(this.props.context),
                content : <AuditView audits={this.props.context.audit} />
            }
        ];
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

                    <div className="col-xs-12 col-md-8 tab-view-container">

                        <TabbedView contents={this.getTabViewContents()} />

                        {/*<ItemDetailList context={context} schemas={schemas} />*/}

                    </div>


                    <div className="col-xs-12 col-md-4 item-info-area section">

                        { typeof context.lab !== 'undefined' || typeof context.award !== 'undefined' ?
                        <hr/>
                        : null }

                        { typeof context.submitted_by !== 'undefined' && ((this.state && typeof this.state.details_submitted_by !== 'undefined') || context.submitted_by) ?
                        <div>
                            { FormattedInfoBlock.User(
                                this.state && typeof this.state.details_submitted_by !== 'undefined' ?
                                this.state.details_submitted_by : context.submitted_by
                            ) }
                            { typeof context.lab !== 'undefined' ? <hr/> : null }
                        </div>
                        : null }

                        
                        { typeof context.lab !== 'undefined' ?
                        <div className>
                            { FormattedInfoBlock.Lab(
                                this.state && typeof this.state.details_lab !== 'undefined' ?
                                this.state.details_lab : context.lab
                            ) }
                            { typeof context.award !== 'undefined' ? <hr/> : null }
                        </div>
                        : null }

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


globals.panel_views.register(DefaultItemView, 'Item');
