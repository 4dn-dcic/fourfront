'use strict';

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { isServerSide, console, object, ajax } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { expFxn } from './../util';
import { SearchTableTitle } from './components/tables/ItemPageTable';
import { EmbeddedExperimentSetSearchTable } from './components/tables/ExperimentSetTables';
import { OverViewBodyItem } from './DefaultItemView';
import FileView, { RelatedFilesOverViewBlock } from './FileView';
import { QualityControlResults } from './QualityMetricView';
import { VitesscePlainContainer } from './components/Vitessce/VitesscePlainContainer';

export default class FileMicroscopyView extends FileView {

    getTabViewContents(){
        const tabs = super.getTabViewContents();
        const width = this.getTabViewWidth();

        // Replace default FileOverview (1st tab) with FileMicroscopyViewOverview
        tabs[0] = FileMicroscopyViewOverview.getTabObject(this.props, width);

        const { context: { tags = [] } = {} } = this.props;
        if (Array.isArray(tags) && tags.indexOf('vitessce') !== -1) {
            tabs.splice(1, 0, FileViewVitessce.getTabObject(this.props, width));
        }

        return tabs;
    }

}


class FileMicroscopyViewOverview extends React.Component {

    static getTabObject({ context, schemas, windowWidth }, width){
        return {
            'tab' : <span><i className="icon icon-file-alt fas icon-fw"/> Overview</span>,
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
        const experimentSets = expFxn.experimentSetsFromFile(context, 'list');
        const searchHref =
            experimentSets && experimentSets.length > 0 ?
                '/search/?type=ExperimentSet&accession=' + _.pluck(experimentSets, 'accession').join('&accession=')
                : null;
        const expSetTableProps = {
            searchHref,
            facets: null,
            defaultOpenIndices: [0],
            title: <SearchTableTitle title="Experiment Set" externalSearchLinkVisible />
        };

        return (
            <div>
                <FileMicOverViewBody {...{ context, schemas, windowWidth }} />
                {searchHref ? <EmbeddedExperimentSetSearchTable {...expSetTableProps} /> : null}
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
    const { microscope_configuration } = file;

    const parentExperimentsReversed = (file.experiments || []).slice(0).reverse(); // Last is newest.

    const parentExperimentWithImagingPaths = _.find(parentExperimentsReversed, function(exp){
        return Array.isArray(exp.imaging_paths) && exp.imaging_paths.length > 0 && typeof exp.imaging_paths[0].channel === 'string' && exp.imaging_paths[0].path;
    }) || parentExperimentsReversed[0] || null;

    let thumbnailSrc = typeof file.thumbnail === 'string' && file.thumbnail;
    let thumbnailLink = null;

    if (thumbnailSrc){
        thumbnailSrc = thumbnailSrc.replace(/\/100\/(\?[ctz]=[\d]+)?$/g, "/360/$1");
        if (file.omerolink){
            thumbnailLink = (
                <a href={file.omerolink} className="image-wrapper d-inline-block img-thumbnail link-offset-2 link-underline link-underline-opacity-0 link-underline-opacity-100-hover"
                    target="_blank" data-tip="View in OMERO" rel="noopener noreferrer">
                    <img className="embedded-item-image" src={thumbnailSrc} alt="OMERO Thumbnail" />
                </a>
            );
        } else {
            thumbnailLink = (
                <img className="embedded-item-image image-wrapper d-inline-block img-thumbnail" src={thumbnailSrc} alt="OMERO Thumbnail" />
            );
        }
    } else if (file.omerolink){
        thumbnailLink = (
            <a className="btn btn-primary w-100 mt-2" href={file.omerolink} target="_blank" rel="noopener noreferrer">
                View in OMERO
            </a>
        );
    }

    return (
        <React.Fragment>
            <div className="row overview-blocks">

                { thumbnailLink ? <div className="col-sm-4">{ thumbnailLink }</div> : null }

                {microscope_configuration || parentExperimentWithImagingPaths ?
                    <div className={"overview-blocks col-12 pull-right col-sm-" + (thumbnailLink ? '8' : '12')}>
                        {microscope_configuration ?
                            <OverViewBodyItem result={file} property="microscope_configuration" fallbackTitle="Microscope Configuration" wrapInColumn="col-12" />
                            : null}

                        {parentExperimentWithImagingPaths ?
                            <OverViewBodyItem
                                result={parentExperimentWithImagingPaths} tips={object.tipsFromSchema(schemas, parentExperimentWithImagingPaths)}
                                wrapInColumn={"col-12 pull-right col-sm-" + (thumbnailLink ? '8' : '12')} property="imaging_paths" fallbackTitle="Imaging Paths" overrideTitle={OverViewBodyItem.titleRenderPresets.imaging_paths_header_from_exp}
                                listItemElement="div" listWrapperElement="div" singleItemClassName="block" titleRenderFxn={OverViewBodyItem.titleRenderPresets.imaging_paths_from_exp} />
                            : null}
                    </div>
                    : null}

            </div>
            <div className="row overview-blocks">
                <QualityControlResults file={file} wrapInColumn="col-md-6" schemas={schemas} hideIfNoValue />
                <RelatedFilesOverViewBlock file={file} property="related_files" wrapInColumn="col-md-6" schemas={schemas} hideIfNoValue />
            </div>
        </React.Fragment>
    );
});

function FileViewVitessce (props) {
    const { context, windowWidth, width, schemas, href } = props;
    const { href: fileHref, display_title: name, description = null } = context || {};

    const config = useMemo(function () {
        const urlParts = url.parse(href, true);
        const baseHref = (urlParts.protocol && urlParts.host) ? urlParts.protocol + '//' + urlParts.host : '';

        return {
            "version": "1.0.16",
            "name": name,
            "description": description || "-",
            "datasets": [
                {
                    "uid": "A",
                    "name": "image stack",
                    "files": [
                        {
                            "type": "raster",
                            "fileType": "raster.json",
                            "options": {
                                "schemaVersion": "0.0.2",
                                "images": [
                                    {
                                        "name": name,
                                        "type": "ome-tiff",
                                        "url": baseHref + fileHref
                                    }
                                ],
                                "usePhysicalSizeScaling": true,
                                "renderLayers": [
                                    name
                                ]
                            }
                        }
                    ]
                }
            ],
            "layout": [
                {
                    "component": "spatial",
                    "x": 0,
                    "y": 0,
                    "w": 9,
                    "h": 12
                },
                {
                    "component": "layerController",
                    "x": 9,
                    "y": 0,
                    "w": 3,
                    "h": 12
                }
            ],
            "initStrategy": "auto"
        };
    }, [href, fileHref, name, description]);
    return (
        <div>
            <div className="row overview-blocks">
                <VitesscePlainContainer height={800} width={1120} theme="light" config={config} />
            </div>
        </div>
    );
}
FileViewVitessce.propTypes = {
};
FileViewVitessce.getTabObject = function({ context, schemas, windowWidth, href }, width){
    return {
        'tab' : <span><i className="icon icon-project-diagram fas icon-fw"/> Vitessce</span>,
        'key' : 'file-vitessce',
        //'disabled' : !Array.isArray(context.experiments),
        'content' : (
            <div className="overflow-hidden">
                <h3 className="tab-section-title">
                    <span>Vitessce Visualization</span>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <FileViewVitessce {...{ context, width, windowWidth, schemas, href }} />
            </div>
        )
    };
};
