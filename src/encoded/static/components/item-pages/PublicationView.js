'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { console, object } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { formatPublicationDate } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/LocalizedTime';

import { ExperimentSetTableTabView } from './components/tables/ExperimentSetTables';
import DefaultItemView from './DefaultItemView';
import { UserContentBodyList } from './../static-pages/components';


export default class PublicationView extends DefaultItemView {

    getTabViewContents(){
        const { context, browseBaseState } = this.props;
        const tabs = [];
        const width = this.getTabViewWidth();

        tabs.push(PublicationSummary.getTabObject(this.props, width));

        if ((context.exp_sets_used_in_pub || []).length > 0 || (context.exp_sets_prod_in_pub || []).length > 0){
            const expSetTableProps = _.extend({}, this.props, {
                'requestHref' : (
                    "/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&sort=experiments_in_set.experiment_type.display_title&" +
                    (browseBaseState === "only_4dn" ? "award.project=4DN&" : "") +
                    "publications_of_set.display_title=" + context.display_title
                )
            });
            tabs.push(ExperimentSetTableTabView.getTabObject(expSetTableProps, width));
        }

        return tabs.concat(this.getCommonTabs()); // Add remainder of common tabs (Details, Attribution)
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
        const { context } = this.props;
        const { url, authors } = context;
        const authorsLastIdx  = authors && (authors.length - 1);

        return (
            <div id="publication-details">

                { Array.isArray(authors) && authors.length > 0 ?
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
                    : null }

                { url ?
                    <React.Fragment>
                        <h4 className={"mt-" + (Array.isArray(authors) && authors.length > 0 ? '3' : '2') + " mb-1 text-500"}>
                            Link
                        </h4>
                        <p><a href={url} target="_blank" rel="noopener noreferrer">{ url }</a></p>
                    </React.Fragment>
                    : null }

            </div>
        );
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
        const { context } = this.props;
        const { journal, categories, date_published, ID } = context;
        const datePublished = formatPublicationDate(date_published);

        return (
            <React.Fragment>
                <hr className="mb-0" />
                <div className="row">
                    <div className="col-12 col-md-8">
                        { journal ?
                            <React.Fragment>
                                <h4 className="mt-2 mb-15 text-500">
                                    Journal
                                </h4>
                                <h5 className="mb-02 text-400">{ journal }</h5>
                                { ID ? <p className="text-small">{ ID }</p> : null }
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
                    <div className="col-12 col-md-4">
                        { Array.isArray(categories) && categories.length > 0 ?
                            <React.Fragment>
                                <h4 className="mt-2 mb-15 text-500">
                                    { categories.length > 1 ? 'Categories' : 'Category' }
                                </h4>
                                {
                                    _.map(categories, (cat)=>
                                        <button type="button" className="btn btn-xs btn-info mr-02 mb-02 text-capitalize"
                                            href={"/search/?type=Publication&categories=" + encodeURIComponent(cat) }>
                                            { cat }
                                        </button>
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
                <ul>{ _.map(contributingLabs, labListItem) }</ul>
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
                        <div className="col-12 col-md-8">
                            { abstractCol }
                        </div>
                        : null }
                    <div className={"col-12 col-md-" + (abstractCol ? '4' : '12' )}>
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
