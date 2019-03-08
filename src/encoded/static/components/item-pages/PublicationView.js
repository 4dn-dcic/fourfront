'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Button, Collapse } from 'react-bootstrap';
import { console, object, DateUtility } from './../util';
import { FormattedInfoBlock, ExperimentSetTablesLoadedFromSearch } from './components';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';
import { UserContentBodyList } from './../static-pages/components';


export default class PublicationView extends DefaultItemView {

    getTabViewContents(){

        var initTabs    = [],
            windowWidth = this.props.windowWidth,
            width       = this.getTabViewWidth(),
            context     = this.props.context;

        initTabs.push(PublicationSummary.getTabObject(this.props, width));

        if ((context.exp_sets_used_in_pub || []).length > 0 || (context.exp_sets_prod_in_pub || []).length > 0){
            initTabs.push(PublicationExperimentSets.getTabObject(this.props, width));
        }

        return initTabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution, Audits)
    }

}




class PublicationSummary extends React.PureComponent {

    /**
     * Get overview tab object for tabpane.
     *
     * @param {Object} props - Parent Component props, as passed down from app.js
     * @param {number} width - Width of tab container.
     */
    static getTabObject(props, width){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'overview',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Overview</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <PublicationSummary {...props} width={width} />
                </div>
            )
        };
    }

    attribution(){
        var { context }     = this.props,
            authors         = Array.isArray(context.authors) && context.authors.length > 0 && context.authors,
            authorsLastIdx  = authors && (authors.length - 1),
            url             = context.url,
            retArr          = [];

        if (authors){
            retArr.push(
                <React.Fragment>
                    <h4 className="mt-2 mb-15 text-500">
                        Author{ authors.length > 1 ? 's' : null }
                    </h4>
                    <p>
                    { _.map(authors, function(author, i){
                        return (
                            <React.Fragment>
                                <span className="no-wrap">
                                    { author }
                                </span>
                                { i !== authorsLastIdx ? <React.Fragment> &nbsp;&bull;&nbsp; </React.Fragment> : null }
                            </React.Fragment>
                        );
                    }) }
                    </p>
                </React.Fragment>
            );
        }

        if (url){
            retArr.push(
                <React.Fragment>
                    <h4 className={"mt-" + (authors ? '3' : '2') + " mb-1 text-500"}>
                        Link
                    </h4>
                    <p><a href={url} target="_blank">{ url }</a></p>
                </React.Fragment>
            );
        }

        return <div id="publication-details">{ retArr }</div>;
    }

    abstract(){
        var { context } = this.props;
        if (!context.abstract) return null;
        return (
            <div id="abstract">
                <h4 className="mt-2 mb-15 text-500">
                    Abstract
                </h4>
                <p>{ context.abstract }</p>
            </div>
        );
    }

    details(){
        var { context }     = this.props,
            journal         = context.journal,
            categories      = Array.isArray(context.categories) && context.categories.length > 0 && context.categories,
            datePublished   = context.date_published && DateUtility.formatPublicationDate(context.date_published),
            id              = context.ID,
            retArr          = [];

        return (
            <React.Fragment>
                <hr className="mb-0" />
                <div className="row">
                    <div className="col-xs-12 col-md-8">
                        { journal ?
                            <React.Fragment>
                                <h4 className="mt-2 mb-15 text-500">
                                    Journal
                                </h4>
                                <h5 className="mb-02 text-400">{ journal }</h5>
                                { id ? <p className="text-small">{ id }</p> : null }
                            </React.Fragment>
                        : null }
                        { datePublished ?
                            <React.Fragment>
                                <h5 className="mt-2 mb-02 text-500">
                                    Published
                                </h5>
                                <p>{ datePublished }</p>
                            </React.Fragment>
                        : null }
                    </div>
                    <div className="col-xs-12 col-md-4">
                        { categories ?
                            <React.Fragment>
                                <h4 className="mt-2 mb-15 text-500">
                                    { categories.length > 1 ? 'Categories' : 'Category' }
                                </h4>
                                {
                                    _.map(categories, (cat)=>
                                        <Button bsSize="xs" bsStyle="info" className="mr-02 mb-02 text-capitalize"
                                            children={cat} href={"/search/?type=Publication&categories=" + encodeURIComponent(cat) }/>
                                    )
                                }
                            </React.Fragment>
                        : null }
                    </div>
                </div>
            </React.Fragment>
        );

    }

    /**
     * Deprecated since Attribution tab was added.
     *
     * @deprecated
     */
    contributingLabs(){
        var { context } = this.props,
            contributingLabs = _.filter(
                (Array.isArray(context.contributing_labs) && context.contributing_labs.length > 0 && context.contributing_labs) || [],
                function(lab){
                    // Exclude labs which don't have permission to view, in case any exist.
                    return lab && !lab.error;
                }
            );

        if (contributingLabs.length === 0) return null;

        function labListItem(lab){
            var labHref = object.itemUtil.atId(lab);
            if (!labHref || lab.error) return null;

            return (
                <li className="contributing-lab" key={lab.uuid || labHref}>
                    <a href={labHref}>{ lab.display_title }</a>
                </li>
            );
        }

        return (
            <div>
                <hr className="mb-0" />
                <h4 className="mt-2 mb-15 text-500">
                    { contributingLabs.length > 1 ? 'Contributing Labs' : 'Contributing Lab' }
                </h4>
                <ul children={ _.map(contributingLabs, labListItem) } />
            </div>
        );
    }

    render(){
        var { context } = this.props,
            abstractCol = this.abstract(),
            staticContent = _.pluck(_.filter(context.static_content || [], function(s){
                return s.content && !s.content.error && s.location === 'tab:overview';
            }), 'content');

        return (
            <div>
                <div className="row">
                    { abstractCol ?
                        <div className="col-xs-12 col-md-8">
                            { abstractCol }
                        </div>
                    : null }
                    <div className={"col-xs-12 col-md-" + (abstractCol ? '4' : '12' )}>
                        { this.attribution() }
                    </div>
                </div>
                { this.details() }
                { staticContent.length > 0 ? (
                    <div className="mt-2">
                        <hr/>
                        <UserContentBodyList contents={staticContent} />
                    </div>
                ) : null }
            </div>
        );
    }
}


class PublicationExperimentSets extends React.PureComponent {

    /**
     * Get overview tab object for tabpane.
     *
     * @param {Object} props - Parent Component props, as passed down from app.js
     * @param {number} width - Width of tab container.
     */
    static getTabObject(props, width){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Experiment Sets</span>,
            'key' : 'pub-expsets',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <PublicationExperimentSets {...props} width={width} />
                </div>
            )
        };
    }

    constructor(props){
        super(props);
        this.getCountCallback = this.getCountCallback.bind(this);
        this.state = {
            'totalCount' : null
        };
    }

    getCountCallback(resp){
        if (resp && typeof resp.total === 'number'){
            this.setState({ 'totalCount' : resp.total });
        }
    }


    render(){
        var { windowWidth, context } = this.props,
            { totalCount } = this.state,
            requestHref = (
                "/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&sort=experiments_in_set.experiment_type.title&publications_of_set.uuid=" + context.uuid
            ),
            title = 'Experiment Sets Published';

        if (totalCount){
            title = totalCount + ' Experiment Sets Published';
        }

        return (
            <div>
                <ExperimentSetTablesLoadedFromSearch requestHref={requestHref} windowWidth={windowWidth} onLoad={this.getCountCallback} title={title} />
                { totalCount && totalCount > 25 ?
                    <Button className="mt-2" href={requestHref} bsStyle="primary" bsSize="lg">
                        View all Experiment Sets ({ totalCount - 25 + ' more' })
                    </Button>
                : null }
            </div>
        );
    }

}
