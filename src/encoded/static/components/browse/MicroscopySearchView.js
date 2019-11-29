'use strict';

import React from 'react';
import memoize from 'memoize-one';
import _ from 'underscore';

import { DropdownItem, DropdownButton, Modal } from 'react-bootstrap';
import { SearchView as CommonSearchView } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/SearchView';
import { console, ajax, navigate, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { Alerts } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Alerts';

import { columnExtensionMap } from './columnExtensionMap';
import { Schemas } from './../util';

import { transformedFacets } from './SearchView';



const microscopyColExtensionMap = _.extend({}, columnExtensionMap, {
    "microscope.Tier": {
        "widthMap": { "sm": 50, "md": 70, "lg": 80 }
    },
    "microscope.Manufacturer": {
        "widthMap": { "sm": 80, "md": 100, "lg": 120 }
    },
    "microscope.Serial": {
        "widthMap": { "sm": 80, "md": 100, "lg": 120 }
    },
    "microscope.Model": {
        "widthMap": { "sm": 80, "md": 100, "lg": 120 }
    },
    "microscope.Type": {
        "widthMap": { "sm": 80, "md": 100, "lg": 120 }
    },
    "submitted_by.display_title": {
        "widthMap": { "sm": 100, "md": 100, "lg": 120 }
    },
});

export default class MicroscopySearchView extends React.PureComponent {

    constructor(props) {
        super(props);

        this.handleModalCancel = this.handleModalCancel.bind(this);
        this.handleModalConfirm = _.throttle(this.handleModalConfirm.bind(this), 3000);
        this.handleChangeMicroscopeName = this.handleChangeMicroscopeName.bind(this);
        this.handleChangeMicroscopeTier = this.handleChangeMicroscopeTier.bind(this);
        this.handleChangeMicroscopeValidationTier = this.handleChangeMicroscopeValidationTier.bind(this);

        this.memoized = {
            transformedFacets: memoize(transformedFacets)
        };

        this.state = {
            show: false,
            tier: 1,
            validationTier: 1,
            microscopeName: null,
            confirmLoading: false
        };
    }

    createNewMicroscopeConfiguration() {
        const { show, tier, validationTier, microscopeName, confirmLoading } = this.state;
        const validationTierOptions = _.range(1, tier + 1);
        return (
            <React.Fragment>
                <DropdownButton id="tier-selector" onSelect={this.handleChangeMicroscopeTier}
                    title="Crete New Configuration" >
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


                <Modal show={show}>
                    <Modal.Header>
                        <Modal.Title>New Microscope - Tier {tier} </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div>
                            <label>Microscope Name</label>
                        </div>
                        <div>
                            <input type="text" style={{ width: "100%" }} value={microscopeName} onChange={this.handleChangeMicroscopeName} ></input>
                        </div>
                        <div>
                            <label>Validation Tier</label>
                        </div>
                        <div>
                            <DropdownButton id="validation-tier-selector" onSelect={this.handleChangeMicroscopeValidationTier}
                                title={'Tier ' + validationTier} style={{ width: "100%" }} >
                                {validationTierOptions.map((opt, i) => (
                                    <DropdownItem key={opt} eventKey={opt} data-key={opt}>
                                        {'Tier ' + opt}
                                    </DropdownItem>
                                ))}
                            </DropdownButton>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <button type="button" onClick={this.handleModalConfirm} className="btn btn-success" disabled={!microscopeName}>
                            <i className={"icon icon-fw icon-" + (confirmLoading ? 'circle-notch icon-spin fas' : 'clone far')} />Submit
                        </button>
                        <button type="button" onClick={this.handleModalCancel} className="btn btn-outline-warning">
                            <i className="icon icon-fw icon-times mr-05 fas" />Cancel
                        </button>
                    </Modal.Footer>
                </Modal>
            </React.Fragment>
        );
    }

    handleModalCancel(evt) {
        this.setState({ 'show': null });
    }

    handleModalConfirm() {
        const { microscopeName, tier, validationTier } = this.state;

        const fallbackCallback = (errResp, xhr) => {
            // Error callback
            Alerts.queue({
                'title': "Failed to save configuration.",
                'message': "Sorry, can you try to save again?",
                'style': 'danger'
            });
            this.setState({ 'confirmLoading': false });
        };

        const microscope = { 'Name': microscopeName, 'Tier': tier, 'ValidationTier': validationTier };

        const payload = {
            'title': microscopeName,
            'description': '',
            'microscope': microscope,
            // We don't include other properties and let them come from schema default values.
            // For example, default status is 'draft', which will be used.
            // Lab and award do not carry over as current user might be from different lab.
        };

        // Try to POST/PUT a new viewconf.
        this.setState(
            { 'confirmLoading': true },
            () => {
                ajax.load(
                    '/microscope-configurations/',
                    (resp) => { // We're likely to get a status code of 201 - Created.
                        this.setState({ 'confirmLoading': false, 'show': false }, () => {
                            const newItemHref = object.itemUtil.atId(resp['@graph'][0]);
                            // Redirect the user to the new Microscope display.
                            navigate(newItemHref, {}, (resp) => {
                                // Show alert on new Item page
                                Alerts.queue({
                                    'title': "Created " + microscope.Name,
                                    'message': "Created new microscope configuration.",
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

    handleChangeMicroscopeName(evt) {
        this.setState({ 'microscopeName': evt.target.value });
    }

    handleChangeMicroscopeTier(eventKey) {
        this.setState({
            show: true,
            tier: parseInt(eventKey)
        });
    }

    handleChangeMicroscopeValidationTier(eventKey) {
        this.setState({
            validationTier: parseInt(eventKey)
        });
    }

    render() {
        const { isFullscreen, href, context, currentAction, session, schemas } = this.props;
        const facets = this.memoized.transformedFacets(href, context, currentAction, session, schemas);
        const tableColumnClassName = "expset-result-table-fix col-12" + (facets.length > 0 ? " col-sm-7 col-lg-8 col-xl-" + (isFullscreen ? '10' : '9') : "");
        const facetColumnClassName = "col-12 col-sm-5 col-lg-4 col-xl-" + (isFullscreen ? '2' : '3');
        return (
            <div className="container" id="content">
                <CommonSearchView {...this.props} {...{ tableColumnClassName, facetColumnClassName, facets }}
                    termTransformFxn={Schemas.Term.toName} separateSingleTermFacets columnExtensionMap={microscopyColExtensionMap} topLeftChildren={this.createNewMicroscopeConfiguration()} />
            </div>
        );
    }
}
