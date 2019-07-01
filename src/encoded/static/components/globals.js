'use strict';

import Registry from './../libs/registry';
import { console, isServerSide } from './util';
// soon:
// import import Registry from '@hms-dbmi-bgm/shared-portal-components/src/components/navigation/components/Registry';
// import { console, isServerSide } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';


/**
 * Registry of views for Item pages, keyed by Item type.
 * To register a new view for a given `@type`, may do the following:
 *
 * @type {Registry}
 * @example content_views.register(SomeReactViewComponent, 'ItemType');
 */
export const content_views = new Registry();

/**
 * Registry of views for panels. Works similarly to `content_views`.
 * Currently not being used but may be at a future time/date.
 *
 * @type {Registry}
 */
export const panel_views = new Registry();



/**
 * Hostnames which are considered to be canonical for 4DN data.
 * If "current" hostname is not in this list, is presumed to be a development environment,
 * and minor visual changes, such as the test data warning banner, appear.
 *
 * @type {Object.<number>}
 */
export const productionHost = {
    'www.data.4dnucleome.org':1, 
    'data.4dnucleome.org':1,
    //'www.testportal.4dnucleome.org':1, 
    //'testportal.4dnucleome.org':1,
    'fourfront-webdev.us-east-1.elasticbeanstalk.com':1,
};


/**
 * Map of biological data URIs to type of UUID.
 * Currently not used, but saved in case necessary later for something.
 *
 * @constant
 * @public
 * @deprecated
 * @type {Object.<string>}
 */
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

/**
 * Returns the current URL/HREF from the browser, if it is available.
 * Accepts optional fallback href or value.
 *
 * @param {*} [fallbackHref] Fallback value if window.location.href is not available (e.g. if server-side).
 * @returns {string} Current window href, or fallback value.
 * @deprecated
 */
export function windowHref(fallbackHref){
    if (!isServerSide() && window.location && window.location.href) return window.location.href;
    return fallbackHref;
}
