'use strict';

import React from 'react';
import memoize from 'memoize-one';
import _ from 'underscore';
import url from 'url';
import { DropdownItem, DropdownButton, Modal } from 'react-bootstrap';
import { getAbstractTypeForType } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/schema-transforms';
import { SearchView as CommonSearchView } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/SearchView';
import { console, isSelectAction, ajax, navigate , object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { Alerts } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Alerts';
import { columnExtensionMap } from './columnExtensionMap';
import { memoizedUrlParse } from './../globals';
import { Schemas } from './../util';


const microscopyColExtensionMap = _.extend({}, columnExtensionMap, {
    "microscope.Tier": { "widthMap": { "sm": 50, "md": 70, "lg": 80 } },
    "microscope.Manufacturer": { "widthMap": { "sm": 80, "md": 100, "lg": 120 } },
    "microscope.Serial": { "widthMap": { "sm": 80, "md": 100, "lg": 120 } },
    "microscope.Model": { "widthMap": { "sm": 80, "md": 100, "lg": 120 } },
    "microscope.Type": { "widthMap": { "sm": 80, "md": 100, "lg": 120 } },
    "submitted_by.display_title": { "widthMap": { "sm": 100, "md": 100, "lg": 120 } },
});
export default class MicroscopySearchView extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleModalCancel = this.handleModalCancel.bind(this);
        this.handleConfirm = _.throttle(this.handleConfirm.bind(this), 3000);
        this.handleMicroscopeNameChange = this.handleMicroscopeNameChange.bind(this);

        this.state = {
            show: false,
            tier: 1,
            validationTier: 1,
            microscopeName: '',
            cloneLoading: false
        };

        this.searchResultTableRef = React.createRef();
    }
    leftButtonDropDownButton() {
        const { show, tier, validationTier, microscopeName,cloneLoading } = this.state;
        const validationTierOptions=_.range(1,tier+1);
        return (
            <>
                <DropdownButton id="search-item-type-selector" onSelect={(eventKey, evt) => { this.onChangeCreateTier(eventKey); }}
                    title={'Crete New Configuration'} >
                    <DropdownItem eventKey="1" data-key="1" type="number" >
                        Tier 1
                    </DropdownItem>
                    <DropdownItem eventKey="2" data-key="2" type="number" >
                        Tier 2
                    </DropdownItem>
                    <DropdownItem eventKey="3" data-key="3" type="number" >
                        Tier 3
                    </DropdownItem>
                    <DropdownItem eventKey="4" data-key="4" type="number" >
                        Tier 4
                    </DropdownItem>
                    <DropdownItem eventKey="5" data-key="5" type="number" >
                        Tier 5
                    </DropdownItem>
                </DropdownButton>


                <Modal show={show} >
                    <Modal.Header>
                        <Modal.Title>New Microscope - Tier {tier} </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div>
                            <label>Microscope Name</label>
                        </div>
                        <div>
                            <input type="text" style={{ width: "100%" }} value={microscopeName} onChange={this.handleMicroscopeNameChange} ></input>
                        </div>
                        <div>
                            <label>Validation Tier</label>
                        </div>
                        <div>
                            <DropdownButton id="search-item-type-selector" onSelect={this.onChangeValidationTier.bind(this)}
                                title={validationTier} style={{ width: "100%" }} >
                                {validationTierOptions.map((opt, i) => (
                                    <DropdownItem key={opt} eventKey={opt} data-key={opt}>
                                        {'Tier ' + opt}
                                    </DropdownItem>
                                ))}
                            </DropdownButton>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <button type="button" onClick={this.handleConfirm} className="btn btn-success" disabled={!microscopeName}>
                            <i className={"icon icon-fw icon-" + (cloneLoading ? 'circle-notch icon-spin fas' : 'clone far')}/>&nbsp; Submit

                        </button>
                        <button type="button" onClick={this.handleModalCancel} className="btn btn-outline-warning">
                            <i className="icon icon-fw icon-times mr-05 fas" />Cancel
                        </button>
                    </Modal.Footer>
                </Modal>
            </>
        );
    }
    handleModalCancel(evt) {
        this.setState({ 'show': null });
    }
    handleConfirm() {
        const { microscopeName, tier, validationTier } = this.state;
        const fallbackCallback = (errResp, xhr) => {
            // Error callback
            Alerts.queue({
                'title': "Failed to save configuration.",
                'message': "Sorry, can you try to save again?",
                'style': 'danger'
            });
            this.setState({ 'cloneLoading': false });
        };

        const microscope = { 'Name': microscopeName, 'Tier':tier  , 'ValidationTier':validationTier };

        const payload = {
            'title': 'New Microscope',
            'description': 'New Microscope Description',
            'microscope': microscope,
            // We don't include other properties and let them come from schema default values.
            // For example, default status is 'draft', which will be used.
            // Lab and award do not carry over as current user might be from different lab.
        };

        // Try to POST/PUT a new viewconf.
        this.setState(
            { 'cloneLoading': true },
            () => {
                ajax.load(
                    '/microscope-configurations/',
                    (resp) => { // We're likely to get a status code of 201 - Created.
                        this.setState({ 'cloneLoading': false }, () => {
                            const newItemHref = object.itemUtil.atId(resp['@graph'][0]);

                            // Redirect the user to the new Microscope display.
                            navigate(newItemHref, {}, (resp) => {
                                // Show alert on new Item page
                                Alerts.queue({
                                    'title': "Saved " + microscope.Name,
                                    'message': "Saved new display.",
                                    'style': 'success'
                                });
                            });
                        });
                    },
                    'POST',
                    fallbackCallback,
                    JSON.stringify(payload)
                );
            }
        );
    }
    handleMicroscopeNameChange(evt) {
        this.setState({ 'microscopeName': evt.target.value });
    }
    onChangeCreateTier(eventKey) {
        this.setState({
            show: true,
            tier:parseInt(eventKey)
        });
    }
    onChangeValidationTier(eventKey,event) {
        this.setState({
            validationTier: parseInt(eventKey)
        });
    }
    /**
     * Function which is passed into a `.filter()` call to
     * filter context.facets down, usually in response to frontend-state.
     *
     * Currently is meant to filter out type facet if we're in selection mode,
     * as well as some fields from embedded 'experiment_set' which might
     * give unexpected results.
     *
     * @todo Potentially get rid of this and do on backend.
     *
     * @param {{ field: string }} facet - Object representing a facet.
     * @returns {boolean} Whether to keep or discard facet.
     */
    static filterFacet(facet, currentAction, session){
        // Set in backend or schema for facets which are under development or similar.
        if (facet.hide_from_view) return false;

        // Remove the @type facet while in selection mode.
        if (facet.field === 'type' && isSelectAction(currentAction)) return false;

        // Most of these would only appear if manually entered into browser URL.
        if (facet.field.indexOf('experiments.experiment_sets.') > -1) return false;
        if (facet.field === 'experiment_sets.@type') return false;
        if (facet.field === 'experiment_sets.experimentset_type') return false;

        return true;
    }

    static transformedFacets = memoize(function(href, context, currentAction, session, schemas){
        var facets,
            typeFacetIndex,
            hrefQuery,
            itemTypesInSearch;

        // Clone/filter list of facets.
        // We may filter out type facet completely at this step,
        // in which case we can return out of func early.
        facets = _.filter(
            context.facets,
            function(facet){ return MicroscopySearchView.filterFacet(facet, currentAction, session); }
        );

        // Find facet for '@type'
        typeFacetIndex = _.findIndex(facets, { 'field' : 'type' });

        if (typeFacetIndex === -1) {
            return facets; // Facet not present, return.
        }

        hrefQuery = _.extend({}, memoizedUrlParse(href).query || {});
        if (typeof hrefQuery.type === 'string') hrefQuery.type = [hrefQuery.type];
        itemTypesInSearch = _.without(hrefQuery.type, 'Item');

        if (itemTypesInSearch.length > 0){
            // Keep all terms/leaf-types - backend should already filter down to only valid sub-types through
            // nature of search itself.
            return facets;
        }

        // Avoid modifying in place.
        facets[typeFacetIndex] = _.clone(facets[typeFacetIndex]);

        // Show only base types for when itemTypesInSearch.length === 0 (aka 'type=Item').
        facets[typeFacetIndex].terms = _.filter(facets[typeFacetIndex].terms, function(itemType){
            const parentType = getAbstractTypeForType(itemType.key, schemas);
            return !parentType || parentType === itemType.key;
        });

        return facets;
    });

    /** Filter the `@type` facet options down to abstract types only (if none selected) for Search. */
    transformedFacets(){
        const { href, context, currentAction, session, schemas } = this.props;
        return MicroscopySearchView.transformedFacets(href, context, currentAction, session, schemas);
    }

    render(){
        const { isFullscreen } = this.props;
        const facets = this.transformedFacets();
        const tableColumnClassName = "expset-result-table-fix col-12" + (facets.length > 0 ? " col-sm-7 col-lg-8 col-xl-" + (isFullscreen ? '10' : '9') : "");
        const facetColumnClassName = "col-12 col-sm-5 col-lg-4 col-xl-" + (isFullscreen ? '2' : '3');
        const topLeftChildren = this.leftButtonDropDownButton();
        return (
            <div className="container" id="content">
                <CommonSearchView {...this.props} {...{ tableColumnClassName, facetColumnClassName, facets, topLeftChildren }}
                    termTransformFxn={Schemas.Term.toName} separateSingleTermFacets columnExtensionMap={microscopyColExtensionMap} />
            </div>
        );
    }
}
