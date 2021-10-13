'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';

import { console, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { formatPublicationDate } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/LocalizedTime';

import { PageTitleContainer, TitleAndSubtitleUnder, OnlyTitle, StaticPageBreadcrumbs, pageTitleViews } from './../PageTitle';
import { EmbeddedExperimentSetSearchTable } from './components/tables/ExperimentSetTables';
import { SearchTableTitle } from './components/tables/ItemPageTable';
import DefaultItemView from './DefaultItemView';
import { UserContentBodyList } from './../static-pages/components';
import { getTabStaticContent } from './components/TabbedView';



export default class PublicationView extends DefaultItemView {

    static anyExperimentSetsWithPermissions = memoize(function (expSetsUsedInPub, expSetsProdInPub) {
        return _.any(expSetsUsedInPub || [], object.itemUtil.atId) || _.any(expSetsProdInPub || [], object.itemUtil.atId)
    });

    getTabViewContents(){
        const {
            context : {
                exp_sets_used_in_pub = [],
                exp_sets_prod_in_pub = []
            }
        } = this.props;
        const tabs = [];
        const width = this.getTabViewWidth();
        //summary tab
        tabs.push(PublicationSummary.getTabObject(this.props, width));
        //experiment sets tab
        const anyExperimentSets = PublicationView.anyExperimentSetsWithPermissions(exp_sets_used_in_pub, exp_sets_prod_in_pub);
        if (anyExperimentSets){
            tabs.push(PublicationExperimentSets.getTabObject(this.props, width));
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
            'tab' : <span><i className="icon icon-file-alt fas icon-fw"/> Overview</span>,
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
                                        <span className="text-nowrap">
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
        const datePublished = (date_published && typeof date_published === "string") ? formatPublicationDate(date_published) : null;

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
                                        <a className="btn btn-xs btn-info mr-02 mb-02 text-capitalize"
                                            href={"/search/?type=Publication&categories=" + encodeURIComponent(cat) }>
                                            { cat }
                                        </a>
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
        const { context, windowWidth } = this.props;
        const abstractCol = this.abstract();
        const staticContent = getTabStaticContent(context, 'tab:overview');

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
                        <UserContentBodyList contents={staticContent} windowWidth={windowWidth} />
                    </div>
                ) : null }
            </div>
        );
    }
}
/**
 * Instead of using standard ExperimentSetsTableTabView experiment sets tab content,
 * we splitted experiment sets into 2 table, one of for exp_sets_used_in_pub and the other
 * is for exp_sets_prod_in_pub
 */
class PublicationExperimentSets extends React.PureComponent {
    static propTypes = {
        'facetAutoDisplayThreshold' : PropTypes.number.isRequired
    };
    static defaultProps = {
        'facetAutoDisplayThreshold': 10
    };
    static experimentSetsWithPermissions = memoize(function (expSetsUsedInPub, expSetsProdInPub) {
        const expSetsUsedInPubWithPermissions = _.filter(expSetsUsedInPub || [], object.itemUtil.atId);
        const expSetsProdInPubWithPermissions = _.filter(expSetsProdInPub || [], object.itemUtil.atId);

        return { expSetsUsedInPubWithPermissions, expSetsProdInPubWithPermissions };
    });
    /**
     * Get experiment sets tab object for tabpane.
     *
     * @param {Object} props - Parent Component props, as passed down from app.js
     * @param {number} width - Width of tab container.
     */
    static getTabObject(props, width) {
        return {
            'tab': <span><i className="icon icon-file-alt far icon-fw" /> Experiment Sets</span>,
            'key': 'expsets-table',
            //'disabled' : !Array.isArray(context.experiments),
            'content': <PublicationExperimentSets {...props} width={width} />
        };
    }
    render() {
        const { context, windowWidth, facetAutoDisplayThreshold } = this.props;
        const {
            display_title,
            exp_sets_used_in_pub = [],
            exp_sets_prod_in_pub = []
        } = context || {};

        const { expSetsUsedInPubWithPermissions, expSetsProdInPubWithPermissions } = PublicationExperimentSets.experimentSetsWithPermissions(exp_sets_used_in_pub, exp_sets_prod_in_pub);

        const staticContent = getTabStaticContent(context, 'tab:expsets-table');
        const prodTableProps = {
            searchHref: (
                "/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&sort=experiments_in_set.experiment_type.display_title&" +
                "produced_in_pub.display_title=" + encodeURIComponent(display_title)
            ),
            title: <SearchTableTitle title="Experiment Set" titleSuffix="Produced In Publication" headerElement="h4" externalSearchLinkVisible />,
            hideFacets: ["type", "validation_errors.name", "produced_in_pub.display_title", "publications_of_set.display_title", "experimentset_type"],
            facets: expSetsProdInPubWithPermissions.length >= facetAutoDisplayThreshold ? undefined : null
        };
        const usedTableProps = {
            searchHref: (
                "/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&sort=experiments_in_set.experiment_type.display_title&" +
                "pubs_using.display_title=" + encodeURIComponent(display_title)
            ),
            title: <SearchTableTitle title="Experiment Set" titleSuffix="Used In Publication" headerElement="h4" externalSearchLinkVisible />,
            hideFacets: ["type", "validation_errors.name", "pubs_using.display_title", "publications_of_set.display_title", "experimentset_type"],
            facets: expSetsUsedInPubWithPermissions.length >= facetAutoDisplayThreshold ? undefined : null
        };
        const totalExperimentSets = exp_sets_used_in_pub.length + exp_sets_prod_in_pub.length;
        const totalExperimentSetsWithPermissions = expSetsUsedInPubWithPermissions.length + expSetsProdInPubWithPermissions.length;

        let titleDetailString = null;
        if (expSetsUsedInPubWithPermissions.length > 0 && expSetsProdInPubWithPermissions.length > 0) {
            titleDetailString = totalExperimentSetsWithPermissions + " Experiment Sets associated with this Publication";
        }

        return (
            <div className="overflow-hidden">
                { staticContent && staticContent.length > 0 ? (
                    <div className="mb-2">
                        <UserContentBodyList contents={staticContent} windowWidth={windowWidth} />
                        <hr />
                    </div>
                ) : null}
                {titleDetailString ? (
                    <React.Fragment>
                        <h3 className="tab-section-title">
                            Experiment Sets {titleDetailString.length > 0 ? <span className="small">&nbsp;&nbsp; &bull; {titleDetailString}</span> : null}
                        </h3>
                        <hr className="tab-section-title-horiz-divider" />
                    </React.Fragment>
                ) : null}

                {expSetsProdInPubWithPermissions && expSetsProdInPubWithPermissions.length > 0 ? (
                    <EmbeddedExperimentSetSearchTable {...prodTableProps} />
                ) : null}

                {expSetsUsedInPubWithPermissions && expSetsUsedInPubWithPermissions.length > 0 ? (
                    <EmbeddedExperimentSetSearchTable {...usedTableProps} />
                ) : null}
            </div>
        );
    }
}

const PublicationViewTitle = React.memo(function PublicationViewTitle(props){
    const { alerts, context } = props;
    const { title = null } = context;
    return (
        <PageTitleContainer alerts={alerts}>
            <StaticPageBreadcrumbs>
                <h5 className="text-500 mt-0 mb-0">Publication</h5>
            </StaticPageBreadcrumbs>
            <OnlyTitle>{ title }</OnlyTitle>
        </PageTitleContainer>
    );
});

pageTitleViews.register(PublicationViewTitle, "Publication");
