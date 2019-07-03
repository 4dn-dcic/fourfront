'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Thumbnail } from 'react-bootstrap';
import { isServerSide, console, object } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { expFxn } from './../util';
import { ExperimentSetTablesLoaded } from './components/tables/ExperimentSetTables';
import { OverViewBodyItem } from './DefaultItemView';
import FileView, { RelatedFilesOverViewBlock, QualityControlResults } from './FileView';


export default class FileMicroscopyView extends FileView {

    getTabViewContents(){
        const tabs = super.getTabViewContents();
        const width = this.getTabViewWidth();

        // Replace default FileOverview (1st tab) with FileMicroscopyViewOverview
        tabs[0] = FileMicroscopyViewOverview.getTabObject(this.props, width);

        return tabs;
    }

}


class FileMicroscopyViewOverview extends React.Component {

    static getTabObject({ context, schemas, windowWidth }, width){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'experiments-info',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>More Information</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <FileMicroscopyViewOverview {...{ context, schemas, windowWidth, width }} />
                </div>
            )
        };
    }

    /** @todo Maybe create common set of proptypes to import into places to avoid redundancy */
    static propTypes = {
        'context' : PropTypes.shape({
            'experiments' : PropTypes.arrayOf(PropTypes.shape({
                'experiment_sets' : PropTypes.arrayOf(PropTypes.shape({
                    '@id' : PropTypes.string.isRequired
                }))
            })).isRequired
        }).isRequired
    };

    render(){
        const { context, schemas, width, windowWidth } = this.props;
        const experimentSetUrls = expFxn.experimentSetsFromFile(context, 'ids');

        return (
            <div>
                <FileMicOverViewBody {...{ context, schemas, windowWidth }} />
                { experimentSetUrls && experimentSetUrls.length > 0 ?
                    <ExperimentSetTablesLoaded {...{ experimentSetUrls, width, windowWidth }} defaultOpenIndices={[0]} id={object.itemUtil.atId(context)} />
                    : null }
            </div>
        );

    }

}

/**
 * Adds a Thumbnail item to FileOverViewBody.
 */
const FileMicOverViewBody = React.memo(function FileMicOverViewBody(props){
    const { context, schemas, windowWidth } = props;
    const file = context;

    const parentExperimentsReversed = (file.experiments || []).slice(0).reverse(); // Last is newest.

    const parentExperimentWithImagingPaths = _.find(parentExperimentsReversed, function(exp){
        return Array.isArray(exp.imaging_paths) && exp.imaging_paths.length > 0 && typeof exp.imaging_paths[0].channel === 'string' && exp.imaging_paths[0].path;
    }) || parentExperimentsReversed[0] || null;

    let thumbnailSrc = typeof file.thumbnail === 'string' && file.thumbnail;
    let thumbnailLink = null;

    if (thumbnailSrc){
        if (thumbnailSrc.slice(-5) === '/100/') {
            thumbnailSrc = thumbnailSrc.slice(0, -5) + '/360/';
        }
        thumbnailLink = (
            <Thumbnail href={ file.omerolink || null } className="inline-block" alt="OMERO Thumbnail" target="_blank"
                src={thumbnailSrc} style={{ margin : '12px 0px 0px 0px' }} data-tip={ file.omerolink ? "View in OMERO" : null} />
        );
    } else if (file.omerolink){
        thumbnailLink = (
            <button type="button" className="btn btn-primary btn-block mt-2" href={file.omerolink} target="_blank" rel="noopener noreferrer">
                View in OMERO
            </button>
        );
    }

    return (
        <React.Fragment>
            <div className="row overview-blocks">

                { thumbnailLink ? <div className="col-sm-4">{ thumbnailLink }</div> : null }

                { parentExperimentWithImagingPaths ?
                    <OverViewBodyItem
                        result={parentExperimentWithImagingPaths} tips={object.tipsFromSchema(schemas, parentExperimentWithImagingPaths)}
                        wrapInColumn={"col-xs-12 pull-right col-sm-" + (thumbnailLink ? '8' : '12')} property="imaging_paths" fallbackTitle="Imaging Paths"
                        listItemElement="div" listWrapperElement="div" singleItemClassName="block" titleRenderFxn={OverViewBodyItem.titleRenderPresets.imaging_paths_from_exp} />
                    : null }

            </div>
            <div className="row overview-blocks">
                <QualityControlResults file={file} wrapInColumn="col-md-6" schemas={schemas} hideIfNoValue />
                <RelatedFilesOverViewBlock file={file} property="related_files" wrapInColumn="col-md-6" schemas={schemas} hideIfNoValue />
            </div>
        </React.Fragment>
    );
});
