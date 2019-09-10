'use strict';

import React from 'react';
import memoize from 'memoize-one';


export function getIndividualDisplayTitle(individual){
    const { name, id, data : { individualItem = null } } = individual;
    const { display_title } = individualItem || {};
    return display_title || name || id;
}


export function IndividualBody(props){
    const { selectedNode: individual, onNodeClick, onClose, diseaseToIndex } = props;
    const {
        id, name,
        data: { individualItem = null } = {},
        _parentReferences: parents = [],
        _childReferences: children = []
    } = individual;

    // This should be same as "id" but we grab from here to be safe.
    const {
        '@id' : individualID,
        ethnicity,
        phenotypic_features = []
    } = individualItem || {};

    let showTitle = getIndividualDisplayTitle(individual);
    if (individualID) {
        showTitle = <a href={individualID}>{ showTitle }</a>;
    }

    return (
        <div className="detail-pane-inner">
            <div className="title-box row">
                <div className="col">
                    <label>Individual</label>
                    <h3>{ showTitle }</h3>
                </div>
                { onClose ?
                    <div className="col-auto">
                        <i className="icon icon-times fas clickable" onClick={onClose}/>
                    </div>
                    : null }
            </div>
            <div className="details">
                { ethnicity ? <InlineDetailRow label="Ethnicity" value={ethnicity} /> : null }
                <PhenotypicFeatures features={phenotypic_features} diseaseToIndex={diseaseToIndex} />
                {/*
                <div className="detail-row row" data-describing="parents">
                    <div className="col-12">
                        <label>Parents</label>
                        { !parents.length ? <div><em>None</em></div>
                            : <PartnersLinks onNodeClick={onNodeClick} partners={parents}/>
                        }
                    </div>
                </div>
                <div className="detail-row" data-describing="children">
                    <label>Children</label>
                    { !children.length ? <div><em>None</em></div>
                        : <PartnersLinks onNodeClick={onNodeClick} partners={children}/>
                    }
                </div>
                */}
            </div>
        </div>
    );
}

function InlineDetailRow({ property, label, value }){
    return (
        <div className="detail-row row" data-describing={property || label}>
            <div className="col-6">
                <label className="mb-0">{ label || property }</label>
            </div>
            <div className="col-6">
                <span className="value">{ value }</span>
            </div>
        </div>
    );
}


function PhenotypicFeatures({ features, diseaseToIndex }){
    if (features.length === 0) return null;
    const renderedFeatures = features.map(function(feature, idx){
        const {
            phenotypic_feature : {
                '@id' : featureID,
                display_title: title
            },
            onset_age = null,
            onset_age_units = null
        } = feature;
        return (
            <div className="detail-row-list-item phenotypic-feature" key={featureID}>
                <div className="legend-patch" data-disease-index={diseaseToIndex[featureID]} />
                <a href={featureID} className="title">{ title }</a>
                { onset_age !== null && onset_age_units !== null ?
                    <span className="onset">{ "" + onset_age + " " + onset_age_units + (onset_age > 1 ? "s" : "") }</span>
                    : null }
            </div>
        );
    });
    return (
        <div className="detail-row phenotypic-features" data-describing="phenotypic_features">
            <label className="d-block">Phenotypic Features & Onset</label>
            { renderedFeatures }
        </div>
    );
}
