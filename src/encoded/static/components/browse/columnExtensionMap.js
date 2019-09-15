'use strict';

import React from 'react';
import _ from 'underscore';

import { console, object } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { LocalizedTime, formatPublicationDate } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/LocalizedTime';
import { basicColumnExtensionMap } from '@hms-dbmi-bgm/shared-portal-components/src/components/browse/components/table-commons';
import { Schemas, typedefs, expFxn } from './../util';

// eslint-disable-next-line no-unused-vars
const { Item, ColumnDefinition } = typedefs;

export const DEFAULT_WIDTH_MAP = { 'lg' : 200, 'md' : 180, 'sm' : 120, 'xs' : 120 };

/** Is reused in a couple of places */
function labDisplayTitleRenderFxn(result, columnDefinition, props, width, popLink = false){
    var labItem = result.lab;
    if (!labItem) return null;
    var labLink;
    if (popLink){
        labLink = <a href={object.atIdFromObject(labItem)} target="_blank" rel="noopener noreferrer">{ labItem.display_title }</a>;
    }else{
        labLink = <a href={object.atIdFromObject(labItem)}>{ labItem.display_title }</a>;
    }

    if (!result.submitted_by || !result.submitted_by.display_title){
        return labLink;
    }
    return (
        <span>
            <i className="icon icon-fw icon-user-o user-icon" data-html data-tip={'<small>Submitted by</small> ' + result.submitted_by.display_title} />
            { labLink }
        </span>
    );
}

export const columnExtensionMap = _.extend({}, basicColumnExtensionMap, {
    // TODO: change to organization
    'lab.display_title' : {
        'title' : "Lab",
        'widthMap' : { 'lg' : 200, 'md' : 180, 'sm' : 160 },
        'render' : labDisplayTitleRenderFxn
    },
    'date_published' : {
        'widthMap' : { 'lg' : 140, 'md' : 120, 'sm' : 120 },
        'render' : function(result, columnDefinition, props, width){
            if (!result.date_published) return null;
            return formatPublicationDate(result.date_published);
        },
        'order' : 504
    },
    'google_analytics.for_date' : {
        'title' : 'Analytics Date',
        'widthMap' : { 'lg' : 140, 'md' : 120, 'sm' : 120 },
        'render' : function googleAnalyticsDate(result, columnDefinition, props, width){
            if (!result.google_analytics || !result.google_analytics.for_date) return null;
            return (
                <span className="value">
                    <LocalizedTime timestamp={result.google_analytics.for_date} formatType="date-sm" localize={false} />
                </span>
            );
        }
    },
    'status' : {
        'title' : 'Status',
        'widthMap' : { 'lg' : 120, 'md' : 120, 'sm' : 100 },
        'order' : 501,
        'render' : function statusIndicator(result, columnDefinition, props, width){
            const statusFormatted = Schemas.Term.toName('status', result.status);
            return (
                <span className="value">
                    <i className="item-status-indicator-dot mr-07" data-status={result.status}/>
                    { statusFormatted }
                </span>
            );
        }
    },
    'workflow.title' : {
        'title' : "Workflow",
        'render' : function(result, columnDefinition, props, width){
            if (!result.workflow || !result.workflow.title) return null;
            const { title }  = result.workflow;
            const link = object.itemUtil.atId(result.workflow);
            if (link){
                return (
                    <span className="value">
                        <a href={link}>{ title }</a>
                    </span>
                );
            } else {
                return <span className="value">{ title }</span>;
            }
        }
    },
    'track_and_facet_info.lab_name' : {
        'render' : function(result, columnDefinition, props, width, popLink = false){
            if ( // If same exact lab name as our lab.display_title, then we just use lab render method to get link to lab.
                result.track_and_facet_info && result.track_and_facet_info.lab_name && result.track_and_facet_info.lab_name
                && result.lab && result.lab.display_title && result.lab.display_title === result.track_and_facet_info.lab_name
            ){
                return labDisplayTitleRenderFxn(...arguments);
            } else {
                return (result.track_and_facet_info && result.track_and_facet_info.lab_name) || null;
            }
        }
    },
    'public_release' : {
        'widthMap' : { 'lg' : 140, 'md' : 120, 'sm' : 120 },
        'render' : function publicRelease(result, columnDefinition, props, width){
            if (!result.public_release) return null;
            return (
                <span className="value">
                    <LocalizedTime timestamp={result.public_release} formatType="date-sm" />
                </span>
            );
        },
        'order' : 505
    },
    'number_of_experiments' : {
        'title' : '# of Experiments',
        'widthMap' : { 'lg' : 68, 'md' : 68, 'sm' : 50 },
        'render' : function numberOfExperiments(expSet, columnDefinition, props, width){
            let number_of_experiments = parseInt(expSet.number_of_experiments); // Should exist in DB. Fallback below.
            if (isNaN(number_of_experiments) || !number_of_experiments){
                number_of_experiments = (Array.isArray(expSet.experiments_in_set) && expSet.experiments_in_set.length) || null;
            }
            if (!number_of_experiments){
                number_of_experiments = 0;
            }
            return <span key="val">{ number_of_experiments }</span>;
        }
    },
    'number_of_files' : {
        'title' : '# of Files',
        'noSort' : true,
        'widthMap' : { 'lg' : 60, 'md' : 50, 'sm' : 50 },
        'render' : function numberOfFiles(expSet, columnDefinition, props, width){
            let number_of_files = parseInt(expSet.number_of_files); // Doesn't exist yet at time of writing
            if (isNaN(number_of_files) || !number_of_files){
                number_of_files = expFxn.fileCountFromExperimentSet(expSet, true, false);
            }
            if (!number_of_files){
                number_of_files = 0;
            }
            return <span key="val">{ number_of_files }</span>;
        }

    },
    'experiments_in_set.experiment_categorizer.combined' : {
        'title' : "Assay Details",
        'render' : function experimentCategorizer(result, columnDefinition, props, width){
            // We have arrays here because experiments_in_set is array.
            const cat_value = _.uniq(object.getNestedProperty(result, 'experiments_in_set.experiment_categorizer.value', true)).join('; ');
            // Use first value for name (should be same for all)
            const [ cat_field ] = _.uniq(object.getNestedProperty(result, 'experiments_in_set.experiment_categorizer.field', true));
            if (cat_value === 'No value' || !cat_value){
                return null;
            }
            return (
                <div className="exp-categorizer-cell">
                    <small>{ cat_field }</small>
                    <div className="text-ellipsis-container">{ cat_value }</div>
                </div>
            );
        }
    }
});
