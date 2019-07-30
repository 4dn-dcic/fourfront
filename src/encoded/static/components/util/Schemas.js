'use strict';

import _ from 'underscore';
import React from 'react';

import { linkFromItem } from '@hms-dbmi-bgm/shared-portal-components/src/components/util/object';
import { LocalizedTime, format as dateFormat } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/LocalizedTime';
import { patchedConsoleInstance as console } from '@hms-dbmi-bgm/shared-portal-components/src/components/util/patched-console';
import { getTitleForType, getSchemaProperty, schemasToItemTypeHierarchy } from '@hms-dbmi-bgm/shared-portal-components/src/components/util/schema-transforms';
import {
    capitalize, capitalizeSentence, bytesToLargerUnit, roundLargeNumber, roundDecimal, hrefToFilename
} from '@hms-dbmi-bgm/shared-portal-components/src/components/util/value-transforms';

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
            case 'experimentset_type':
                name = capitalizeSentence(term);
                break;
            case 'type':
                name = getTitleForType(term, get());
                break;
            case 'status':
                name = capitalizeSentence(term);
                break;
            case 'date_created':
            case 'public_release':
            case 'project_release':
                if (allowJSXOutput) name = <LocalizedTime timestamp={term} />;
                else name = dateFormat(term);
                break;
            default:
                name = null;
                break;
        }

        if (typeof name === 'string') return name;

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
        'experiments_in_set.lab.display_title' : 'Lab',
        'lab.display_title' : 'Lab',
        'experiments_in_set.experiment_type' : 'Experiment Type',
        'experiments_in_set.experiment_type.display_title' : 'Experiment Type',
        'experimentset_type' : 'Set Type',
        '@id' : "Link",
        'display_title' : "Title"
    },

    toName : function(field, schemas, itemType = 'ExperimentSet', schemaOnly = false){
        if (!schemaOnly && Field.nameMap[field]){
            return Field.nameMap[field];
        } else {
            const schemaProperty = getSchemaProperty(field, schemas, itemType);
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
