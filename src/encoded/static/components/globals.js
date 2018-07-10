'use strict';

var Registry = require('../libs/registry');
import url from 'url';
import _ from 'underscore';
import { console, isServerSide } from './util';

// Item pages
export const content_views = new Registry();

// Panel detail views
export const panel_views = new Registry();

// Listing detail views
export const listing_views = new Registry();

// Cell name listing titles
export const listing_titles = new Registry();

// Graph detail view
export const graph_detail = new Registry();

// Document panel components
// +---------------------------------------+
// | header                                |
// +---------------------------+-----------+
// |                           |           |
// |          caption          |  preview  |
// |                           |           |
// +---------------------------+-----------+
// | file                                  |
// +---------------------------------------+
// | detail                                |
// +---------------------------------------+
export const document_views = {};
document_views.header = new Registry();
document_views.caption = new Registry();
document_views.preview = new Registry();
document_views.file = new Registry();
document_views.detail = new Registry();


export function itemClass(context, htmlClass) {
    htmlClass = htmlClass || '';
    (context['@type'] || []).forEach(function (type) {
        htmlClass += ' type-' + type;
    });
    return statusClass(context.status, htmlClass);
}

export function statusClass(status, htmlClass) {
    htmlClass = htmlClass || '';
    if (typeof status == 'string') {
        htmlClass += ' status-' + status.toLowerCase().replace(/ /g, '-').replace(/\(|\)/g,'');
    }
    return htmlClass;
}

export function validationStatusClass (status, htmlClass) {
    htmlClass = htmlClass || '';
    if (typeof status == 'string') {
        htmlClass += ' validation-status-' + status.toLowerCase().replace(/ /g, '-');
    }
    return htmlClass;
}

export function truncateString (str, len) {
    if (str.length > len) {
        str = str.replace(/(^\s)|(\s$)/gi, ''); // Trim leading/trailing white space
        var isOneWord = str.match(/\s/gi) === null; // Detect single-word string
        str = str.substr(0, len - 1); // Truncate to length ignoring word boundary
        str = (!isOneWord ? str.substr(0, str.lastIndexOf(' ')) : str) + '…'; // Back up to word boundary
    }
    return str;
}

// Given an array of objects with @id properties, this returns the same array but with any
// duplicate @id objects removed.
export function uniqueObjectsArray(objects){ 
    return _.uniq(objects, false, function(o){ return o['@id']; } );
}

export function bindEvent(el, eventName, eventHandler) {
    if (el.addEventListener) {
        // Modern browsers
        el.addEventListener(eventName, eventHandler, false);
    } else if (el.attachEvent) {
        // IE8 specific
        el.attachEvent('on' + eventName, eventHandler);
    }
}

export function unbindEvent(el, eventName, eventHandler) {
    if (el.removeEventListener) {
        // Modern browsers
        el.removeEventListener(eventName, eventHandler, false);
    } else if (el.detachEvent) {
        // IE8 specific
        el.detachEvent('on' + eventName, eventHandler);
    }
}

// Make the first character of the given string uppercase. Can be less fiddly than CSS text-transform.
// http://stackoverflow.com/questions/1026069/capitalize-the-first-letter-of-string-in-javascript#answer-1026087
String.prototype.uppercaseFirstChar = function(string) {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

// Order that antibody statuses should be displayed
export const statusOrder = [
    'eligible for new data',
    'not eligible for new data',
    'pending dcc review',
    'awaiting lab characterization',
    'not pursued',
    'not reviewed'
];

export const productionHost = {
    'www.data.4dnucleome.org'                   :1, 
    'data.4dnucleome.org'                       :1,
    //'www.testportal.4dnucleome.org'             :1, 
    //'testportal.4dnucleome.org'                 :1,
    'fourfront-webdev.us-east-1.elasticbeanstalk.com':1,
};

export const encodeVersionMap = {
    "ENCODE2": "2",
    "ENCODE3": "3"
};

// Determine the given object's ENCODE version
export function encodeVersion(context) {
    var encodevers = "";
    if (context.award && context.award.rfa) {
        encodevers = encodeVersionMap[context.award.rfa.substring(0,7)];
        if (typeof encodevers === "undefined") {
            encodevers = "";
        }
    }
    return encodevers;
}

export const dbxref_prefix_map = {
    "UniProtKB": "http://www.uniprot.org/uniprot/",
    "HGNC": "http://www.genecards.org/cgi-bin/carddisp.pl?gene=",
    // ENSEMBL link only works for human
    "ENSEMBL": "http://www.ensembl.org/Homo_sapiens/Gene/Summary?g=",
    "GeneID": "http://www.ncbi.nlm.nih.gov/gene/",
    "GEO": "http://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=",
    "GEOSAMN": "http://www.ncbi.nlm.nih.gov/biosample/",
    "Caltech": "http://jumpgate.caltech.edu/library/",
    "Cellosaurus": "http://web.expasy.org/cellosaurus/",
    "FlyBase": "http://flybase.org/cgi-bin/quicksearch_solr.cgi?caller=quicksearch&tab=basic_tab&data_class=FBgn&species=Dmel&search_type=all&context=",
    "WormBase": "http://www.wormbase.org/species/c_elegans/gene/",
    "MGI": "http://www.informatics.jax.org/marker/",
    "RefSeq": "http://www.ncbi.nlm.nih.gov/gene/?term=",
    // UCSC links need assembly (&db=) and accession (&hgt_mdbVal1=) added to url
    "UCSC-ENCODE-mm9": "http://genome.ucsc.edu/cgi-bin/hgTracks?tsCurTab=advancedTab&tsGroup=Any&tsType=Any&hgt_mdbVar1=dccAccession&hgt_tSearch=search&hgt_tsDelRow=&hgt_tsAddRow=&hgt_tsPage=&tsSimple=&tsName=&tsDescr=&db=mm9&hgt_mdbVal1=",
    "UCSC-ENCODE-hg19": "http://genome.ucsc.edu/cgi-bin/hgTracks?tsCurTab=advancedTab&tsGroup=Any&tsType=Any&hgt_mdbVar1=dccAccession&hgt_tSearch=search&hgt_tsDelRow=&hgt_tsAddRow=&hgt_tsPage=&tsSimple=&tsName=&tsDescr=&db=hg19&hgt_mdbVal1=",
    "UCSC-ENCODE-cv": "http://genome.cse.ucsc.edu/cgi-bin/hgEncodeVocab?ra=encode%2Fcv.ra&term=",
    "UCSC-GB-mm9": "http://genome.cse.ucsc.edu/cgi-bin/hgTrackUi?db=mm9&g=",
    "UCSC-GB-hg19": "http://genome.cse.ucsc.edu/cgi-bin/hgTrackUi?db=hg19&g=",
    // Dataset, experiment, and document references
    "PMID": "http://www.ncbi.nlm.nih.gov/pubmed/?term=",
    "PMCID": "http://www.ncbi.nlm.nih.gov/pmc/articles/",
    "doi": "http://dx.doi.org/doi:"
};


export function windowHref(fallbackHref){
    if (!isServerSide() && window.location && window.location.href) return window.location.href;
    return fallbackHref;
}
