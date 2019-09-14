'use strict';

import _ from 'underscore';
import React from 'react';

import { linkFromItem } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/object';
import { LocalizedTime, format as dateFormat } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/LocalizedTime';
import { patchedConsoleInstance as console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/patched-console';
import { getTitleForType, getSchemaProperty } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/schema-transforms';
import {
    capitalize, capitalizeSentence, bytesToLargerUnit, roundLargeNumber, roundDecimal, hrefToFilename
} from '@hms-dbmi-bgm/shared-portal-components/es/components/util/value-transforms';

let cachedSchemas = null;

/**
 * Should be set by app.js to return app.state.schemas
 *
 * @type {function}
 */
export function get(){
    return cachedSchemas;
}

export function set(schemas){
    cachedSchemas = schemas;
    return true;
}


export const Term = {
    toName : function(field, term, allowJSXOutput = false, addDescriptionTipForLinkTos = true){

        if (allowJSXOutput && typeof term !== 'string' && term && typeof term === 'object'){
            // Object, probably an item.
            return linkFromItem(term, addDescriptionTipForLinkTos);
        }

        let name = null;

        switch (field) {
            case 'type':
                return getTitleForType(term, get());
            case 'status':
                if (allowJSXOutput){
                    return <React.Fragment><i className="item-status-indicator-dot mr-07" data-status="released"/>{ capitalizeSentence(term) }</React.Fragment>;
                }
                return capitalizeSentence(term);
            case 'date_created':
            case 'public_release':
            case 'project_release':
                if (allowJSXOutput) return <LocalizedTime timestamp={term} />;
                return dateFormat(term);
            case 'accession':
                //if (allowJSXOutput) {
                //    return <span className="accession text-small">{ term }</span>;
                //}
                return term;
            case 'description':
                if (allowJSXOutput) {
                    return <span className="mono-text text-small">{ term }</span>;
                }
                return term;
            default:
                break;
        }


        // Remove 'experiments_in_set' and test as if an experiment field. So can work for both ?type=Experiment, ?type=ExperimentSet.
        field = field.replace('experiments_in_set.', '');

        switch (field) {
            case 'biosource_type':
            case 'organism.name':
            case 'individual.organism.name':
            case 'biosource.individual.organism.name':
            case 'biosample.biosource.individual.organism.name':
                name = capitalize(term);
                break;
            case 'file_type':
            case 'file_classification':
            case 'file_type_detailed':
            case 'files.file_type':
            case 'files.file_classification':
            case 'files.file_type_detailed':
                name = capitalizeSentence(term);
                break;
            case 'file_size':
                if (typeof term === 'number'){
                    name = term;
                } else if (!isNaN(parseInt(term))) {
                    name = parseInt(term);
                }
                if (typeof name === 'number' && !isNaN(name)){
                    name = bytesToLargerUnit(name);
                } else {
                    name = null;
                }
                break;
            case '@id':
                name = term;
                break;
            default:
                name = null;
                break;
        }

        // Custom stuff
        if (field.indexOf('quality_metric.') > -1){
            if (field.slice(-11) === 'Total reads')     return roundLargeNumber(term);
            if (field.slice(-15) === 'Total Sequences') return roundLargeNumber(term);
            if (field.slice(-14) === 'Sequence length') return roundLargeNumber(term);
            if (field.slice(-15) === 'Cis/Trans ratio') return roundDecimal(term) + '%';
            if (field.slice(-35) === '% Long-range intrachromosomal reads') return roundDecimal(term) + '%';
            if (field.slice(-4) === '.url' && term.indexOf('http') > -1) {
                var linkTitle = hrefToFilename(term); // Filename most likely for quality_metric.url case(s).
                if (allowJSXOutput){
                    return <a href={term} target="_blank" rel="noopener noreferrer">{ linkTitle }</a>;
                } else {
                    return linkTitle;
                }
            }
        }

        // Fallback
        if (typeof name !== 'string') name = term;

        return name;
    }
};


export const Field = {

    nameMap : {
        'experiments_in_set.biosample.biosource.individual.organism.name' : 'Organism',
        'accession' : 'Experiment Set',
        'experiments_in_set.digestion_enzyme.name' : 'Enzyme',
        'experiments_in_set.biosample.biosource_summary' : 'Biosource',
        'experiments_in_set.lab.title' : 'Lab',
        'experiments_in_set.experiment_type' : 'Experiment Type',
        'experiments_in_set.experiment_type.display_title' : 'Experiment Type',
        'experimentset_type' : 'Set Type',
        '@id' : "Link",
        'display_title' : "Title"
    },

    toName : function(field, schemas, schemaOnly = false, itemType = 'ExperimentSet'){
        if (!schemaOnly && Field.nameMap[field]){
            return Field.nameMap[field];
        } else {
            var schemaProperty = getSchemaProperty(field, schemas, itemType);
            if (schemaProperty && schemaProperty.title){
                Field.nameMap[field] = schemaProperty.title; // Cache in nameMap for faster lookups.
                return schemaProperty.title;
            } else if (!schemaOnly) {
                return field;
            } else {
                return null;
            }
        }
    },

    getSchemaProperty : function(field, schemas = null, startAt = 'ExperimentSet'){
        return getSchemaProperty(field, schemas, startAt);
    }

};

