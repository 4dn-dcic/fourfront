'use strict';

import _ from 'underscore';
import React from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import { navigate } from './navigate';
import { isServerSide } from './misc';
import { getNestedProperty } from './object';




export function shouldDisplayStructuredData(baseDomain){
    if (baseDomain.indexOf('data.4dnucleome.org') > -1) return true;
    if (baseDomain.indexOf('localhost:8000') > -1) return true;
    return false;
}



export class CurrentContext extends React.PureComponent {

    static propTypes = {
        'context' : PropTypes.object.isRequired
    };

    static commonSchemaBase(context, hrefParts, baseDomain, extraPageVals = {}){
        var currentURL = baseDomain + context['@id'];
        var base = {
            "@context": "http://schema.org",
            "mainEntityOfPage"  : _.extend({
                "@type"             : "WebPage",
                "isPartOf"          : {
                    "@type"             : "WebSite",
                    "url"               : baseDomain
                },
                "url"               : currentURL
            }, extraPageVals),
            "datePublished"     : context.public_release || context.date_created || null,
            "url"               : currentURL,
            "@id"               : currentURL
        };
        // Optional but common
        //if (context.accession || context.uuid){
        //    base.identifier = context.accession || context.uuid;
        //}
        if (context.description){
            base.description = context.description;
        }
        base.dateModified = (context.last_modified && context.last_modified.date_modified) || base.datePublished || null;
        return base;
    }

    static labToSchema(lab, baseDomain){
        if (!lab || !lab['@id'] || !lab.display_title) return null;
        var labRetObj = {
            "@type"     : "EducationalOrganization",
            "name"      : lab.display_title,
            "url"       : baseDomain + lab['@id'],
            "knowsAbout": FullSite.dcicOrganization(baseDomain)
        };
        if (lab.url && typeof lab.url === 'string'){
            labRetObj['sameAs'] = lab.url;
        }
        return labRetObj;
    }


    static transformationsByType = {
        'User' : function(context){
            // No permission to view currently.
            return null;
        },

        'HomePage' : function(context, hrefParts, baseDomain){
            // Only needed on home page.
            return FullSite.generate(baseDomain);
        },

        /**
         * Generate an 'TechArticle' schema item for Help pages.
         * _OR_ a directory schema item if is a DirectoryPage, as well.
         */
        'HelpPage' : function(context, hrefParts, baseDomain){
            if (context['@id'].slice(0,6) !== '/help/'){
                return null; // Skip if we're on Item page for a Static Page
            }
            var dcicOrg = FullSite.dcicOrganization(baseDomain);

            if (context['@type'].indexOf('DirectoryPage') > -1){
                return _.extend(
                    _.omit(CurrentContext.commonSchemaBase(context, hrefParts, baseDomain, { '@type' : "CollectionPage", '@id' : baseDomain + context['@id'] }), 'datePublished', 'dateModified', '@id'),
                    {
                        "@type"             :"ItemList",
                        "itemListElement"   : _.map(context.children, function(childPage, idx){
                            return {
                                "@type"         : "ListItem",
                                "position"      : idx + 1,
                                "url"           : baseDomain + '/' + childPage.name
                            };
                        })
                    }
                );
            } else {
                return _.extend(_.omit(CurrentContext.commonSchemaBase(context, hrefParts, baseDomain, { '@id' : baseDomain + context['@id'] }), '@id'), {
                    "@type"                 : "TechArticle",
                    "headline"              : context.display_title || context.title,
                    "author"                : dcicOrg,
                    "publisher"             : dcicOrg,
                    "articleSection"        : "Help",
                    "isAccessibleForFree"   : true,
                    "image"                 : FullSite.logo4DN(baseDomain)
                });
            }
        },
        "Browse": function(context, hrefParts, baseDomain){
            var dcicOrg = FullSite.dcicOrganization(baseDomain),
                retObj = FullSite.catalog4DN(baseDomain);

            _.extend(retObj, CurrentContext.commonSchemaBase(context, hrefParts, baseDomain, { "@type" : "SearchResultsPage" }), { 'sameAs' : retObj.url });

            return retObj;
        },
        "ExperimentSet" : function(context, hrefParts, baseDomain){
            var dcicOrg = FullSite.dcicOrganization(baseDomain, false),
                labCreator = CurrentContext.labToSchema(context.lab, baseDomain),
                labContributors = Array.isArray(context.contributing_labs) && _.map(context.contributing_labs, function(cLab){
                    return CurrentContext.labToSchema(cLab, baseDomain);
                }),
                publication = context.produced_in_pub && context.produced_in_pub.short_attribution && context.produced_in_pub.journal && context.produced_in_pub.title && context.produced_in_pub,
                experimentTypes = getNestedProperty(context, 'experiments_in_set.experiment_type.display_title');

            if (experimentTypes && Array.isArray(experimentTypes)){
                experimentTypes = _.uniq(experimentTypes);
            }

            var retObj = _.extend(CurrentContext.commonSchemaBase(context, hrefParts, baseDomain, { "@type" : "ItemPage" }), {
                "@type": "Dataset",
                "includedInDataCatalog" : FullSite.catalog4DN(baseDomain),
                "name" : "Experiment Set - " + context.accession,
                "publisher" : dcicOrg,
                "isAccessibleForFree" : true,
                // TODO: Add correct 'variableMeasured'
                // "variableMeasured" : "Biological Sequence"
            });

            if (labCreator){
                retObj.creator = labCreator;
            }
            if (labContributors){
                retObj.contributor = labContributors;
            }
            if (publication){
                retObj.citation = publication.short_attribution + " '" + publication.title + "', " + publication.journal;
            }

            if (experimentTypes && experimentTypes.length === 1){
                retObj.measurementTechnique = experimentTypes[0];
            } else if (experimentTypes && experimentTypes.length > 1){
                retObj.measurementTechnique = experimentTypes;
            }

            // Add some keywords from various properties.
            var keywords = Array.isArray(experimentTypes) && experimentTypes.length > 0 ? experimentTypes : [],
                listOfPropsForKeyWords = [
                    'experiments_in_set.biosample.biosource_summary',
                    'experiments_in_set.biosample.biosource.biosource_type',
                    'experiments_in_set.biosample.biosource.individual.organism.display_title',
                    'experiments_in_set.biosample.treatments.treatment_type',
                    'experiments_in_set.experiment_categorizer.value'
                ];

            _.forEach(listOfPropsForKeyWords, function(field){
                var value = getNestedProperty(context, field);
                if (!value) return;
                if (Array.isArray(value)){
                    value = _.uniq(_.flatten(value));
                    _.forEach(value, function(v){
                        if (typeof v !== 'string'){
                            return;
                        }
                        keywords.push(v);
                    });
                } else if (typeof value === 'string') {
                    keywords.push(value);
                }
            });

            if (keywords.length > 0){
                retObj.keywords = keywords;
            }

            return retObj;
        },
        "Lab" : function(context, hrefParts, baseDomain){
            var retObj = CurrentContext.labToSchema(context, baseDomain);
            if (!retObj) return null;

            retObj = _.extend(
                _.omit(
                    CurrentContext.commonSchemaBase(context, hrefParts, baseDomain, { "@type" : "ItemPage" }),
                    'datePublished', 'dateModified'
                ),
                retObj
            );

            // Add address if any defined.
            if (context.country || context.postal_code || context.address1 || context.address2 || context.city || context.state){
                retObj.contactPoint = {
                    '@type' : "PostalAddress"
                };
                if (context.country) retObj.contactPoint.addressCountry = context.country;
                if (context.postal_code) retObj.contactPoint.postalCode = context.postal_code;
                if (context.address1) retObj.contactPoint.streetAddress = context.address1;
                if (context.address2) {
                    retObj.contactPoint.streetAddress = retObj.contactPoint.streetAddress ? retObj.contactPoint.streetAddress + ', ' + context.address2 : context.address2;
                }
                if (context.state) retObj.contactPoint.addressRegion = context.state;
                if (context.city) retObj.contactPoint.addressLocality = context.city;
            }

            return retObj;

        }
    }

    /**
     * Go down `@type` list for this Item/context and find a transformation fxn, if any.
     */
    static getTransformFxnForItem(context){
        var types = context['@type'];
        if (!types) return null;
        var currFxn = null;
        for (var i = 0; i < types.length; i++){
            currFxn = CurrentContext.transformationsByType[types[i]];
            if (typeof currFxn === 'function') return currFxn;
        }
        return null;
    }

    render(){
        var { context, hrefParts, baseDomain } = this.props,
            transformFxn        = shouldDisplayStructuredData(baseDomain) && context && CurrentContext.getTransformFxnForItem(context),
            structuredDataJSON  = transformFxn && transformFxn(context, hrefParts, baseDomain);

        if (!structuredDataJSON) return null;
        return (
            <script type="application/ld+json" dangerouslySetInnerHTML={{
                __html: '\n' + JSON.stringify(structuredDataJSON, null, 4) + '\n'
            }} />
        );
    }

}




const FullSite = {


    "logo4DN" : function(baseDomain = 'https://data.4dnucleome.org'){
        return {
            "@type" : "ImageObject",
            "caption" : "Logo for the 4DN Data Portal",
            "width" : {
                "@type" : "QuantitativeValue",
                "unitCode": "E37",
                "value" : 300
            },
            "height" : {
                "@type" : "QuantitativeValue",
                "unitCode": "E37",
                "value" : 300
            },
            //"url" : "https://data.4dnucleome.org/static/img/4dn_logo.svg" // TODO: Update to .png version
            "url" : baseDomain + "/static/img/4dn-logo-raster.png" // TODO: Update to .png version
        };
    },


    "dcicOrganization" : function(portalBaseDomain, short = true){
        var shortVersion = {
            "@type" : "EducationalOrganization",
            "name" : "4DN Data Coordination and Integration Center",
            "sameAs" : "http://dcic.4dnucleome.org/",
            "url" : "https://data.4dnucleome.org/",
            "logo" : FullSite.logo4DN(portalBaseDomain)
        };
        if (short) return shortVersion;
        return _.extend(shortVersion, {
            "member" : [
                {
                    "@type" : "EducationalOrganization",
                    "name" : "Department of Biomedical Informatics",
                    "alternateName" : "HMS DBMI",
                    "url" : "https://dbmi.hms.harvard.edu/",
                    "parentOrganization" : {
                        // This part taken from https://www.harvard.edu source
                        "@type" : "CollegeOrUniversity",
                        "name": "Harvard",
                        "alternateName": "Harvard University",
                        "url": "http://www.harvard.edu",
                        "logo": "http://www.harvard.edu/sites/default/files/content/harvard-university-logo-151.png",
                    },
                    "sameAs" : "https://www.youtube.com/HarvardDBMI"
                },
                {
                    "@type" : "EducationalOrganization",
                    "name" : "Mirny Lab",
                    "url" : "http://mirnylab.mit.edu/",
                    "logo" : "http://mirnylab.mit.edu/assets/images/logo.jpg",
                    "parentOrganization" : {
                        "@type" : "CollegeOrUniversity",
                        "name": "MIT",
                        "alternateName": "Massachusetts Institute of Technology",
                        "url": "http://web.mit.edu",
                        "logo": "http://www.mit.edu/themes/mit/assets/favicon/android-icon-192x192.png",
                    }
                },
            ],
            "knowsAbout" : [
                "http://higlass.io/",
                "https://higlass.4dnucleome.org/",
                "http://www.4dnucleome.org/",
                "http://www.4dnucleome.org/",
                "https://commonfund.nih.gov/4dnucleome"
            ]
        });
    },


    "catalog4DN" : function(baseDomain = 'https://data.4dnucleome.org'){
        var dcicOrg = FullSite.dcicOrganization(baseDomain);
        return {
            "@type": "DataCatalog",
            "name" : "4DN Data Browser",
            "alternateName" : ["Browse", "Data Browser"],
            "creator" : dcicOrg,
            "publisher" : dcicOrg,
            "isAccessibleForFree" : true,
            "url" : baseDomain + "/browse/?" + queryString.stringify(navigate.getBrowseBaseParams('only_4dn'))
        };
    },


    "generate" : function(baseDomain){
        return shouldDisplayStructuredData(baseDomain) && {
            "@context": "http://schema.org",
            "@type": "WebSite",
            "url": baseDomain + '/',
            "description" : "The 4D Nucleome Data Portal hosts data generated by the 4DN Network and other reference nucleomics data sets, and an expanding tool set for open data processing and visualization.",
            "potentialAction": {
                "@type": "SearchAction",
                "target": baseDomain + "/browse/?" + queryString.stringify(navigate.getBrowseBaseParams('only_4dn')) + '&q={search_term_string}',
                "query-input": "required name=search_term_string"
            },
            "creator" : FullSite.dcicOrganization(baseDomain, false),
            "sponsor" : {
                "@type" : "GovernmentOrganization",
                "name" : "National Institutes of Health (NIH)",
                "alternateName" : [
                    "National Institutes of Health",
                    "NIH"
                ],
                "url" : "https://www.nih.gov/"
            },
            "mainEntity" : {
                "@type" : "DataCatalog",
                "url" : baseDomain + "/browse/?" + queryString.stringify(navigate.getBrowseBaseParams('only_4dn'))
            }
        };
    }


};

