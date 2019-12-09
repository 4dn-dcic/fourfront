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
        // this.handleChangeMicroscopeValidationTier = this.handleChangeMicroscopeValidationTier.bind(this);

        this.memoized = {
            transformedFacets: memoize(transformedFacets)
        };

        this.state = {
            show: false,
            tier: 1,
            // validationTier: 1,
            microscopeName: null,
            confirmLoading: false
        };
    }

    createNewMicroscopeConfiguration() {
        const { show, tier/*, validationTier*/, microscopeName, confirmLoading } = this.state;
        const buttonProps = {
            'handleChangeMicroscopeTier': this.handleChangeMicroscopeTier,
            'startTier': 1,
            'endTier': 5
        };
        const modalProps = {
            tier/*, validationTier*/, show, confirmLoading, microscopeName,
            'handleChangeMicroscopeName': this.handleChangeMicroscopeName,
            // 'handleChangeMicroscopeValidationTier': this.handleChangeMicroscopeValidationTier,
            'handleModalConfirm': this.handleModalConfirm,
            'handleModalCancel': this.handleModalCancel
        };
        return (
            <React.Fragment>
                <div className="inline-block ml-1">
                    <CreateNewConfigurationDropDownButton {...buttonProps} />
                </div>
                <CreateNewConfigurationModal {...modalProps} />
            </React.Fragment>
        );
    }

    handleModalCancel(evt) {
        this.setState({ 'show': null });
    }

    handleModalConfirm() {
        const { microscopeName, tier/*, validationTier*/ } = this.state;

        const fallbackCallback = (errResp, xhr) => {
            // Error callback
            Alerts.queue({
                'title': "Failed to save configuration.",
                'message': "Sorry, can you try to save again?",
                'style': 'danger'
            });
            this.setState({ 'confirmLoading': false });
        };

        const microscope = { 'Name': microscopeName, 'Tier': tier, 'ValidationTier': tier/*validationTier*/ };

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
        let createNewVisible = false;
        // don't show during submission search "selecting existing"
        if (context && Array.isArray(context.actions) && !currentAction) {
            const addAction = _.findWhere(context.actions, { 'name': 'add' });
            if (addAction && typeof addAction.href === 'string') {
                createNewVisible = true;
            }
        }
        return (
            <div className="container" id="content">
                <CommonSearchView {...this.props} {...{ tableColumnClassName, facetColumnClassName, facets }}
                    termTransformFxn={Schemas.Term.toName} separateSingleTermFacets columnExtensionMap={microscopyColExtensionMap} topLeftChildren={createNewVisible ? this.createNewMicroscopeConfiguration() : null} />
            </div>
        );
    }
}

const CreateNewConfigurationDropDownButton = React.memo(function (props) {
    const { handleChangeMicroscopeTier, startTier, endTier } = props;
    const tierOptions = _.range(startTier, endTier + 1);
    return (
        <DropdownButton id="tier-selector" onSelect={handleChangeMicroscopeTier}
            title="Crete New Configuration" size="xs">
            {tierOptions.map((opt, i) => (
                <DropdownItem key={opt} eventKey={opt} data-key={opt}>
                    {'Tier ' + opt}
                </DropdownItem>
            ))}
        </DropdownButton>
    );
});

const CreateNewConfigurationModal = React.memo(function (props) {
    const { tier/*, validationTier*/, show, confirmLoading, microscopeName, handleChangeMicroscopeName/*, handleChangeMicroscopeValidationTier*/, handleModalConfirm, handleModalCancel } = props;
    // const validationTierOptions = _.range(1, tier + 1);
    return (
        <Modal className="microscopy-create-modal" show={show}>
            <Modal.Header>
                <Modal.Title>New Microscope - Tier {tier} </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row">
                    <div className="col-sm-12 col-md-12">
                        <div className="form-group">
                            <label htmlFor="microscope_name">Microscope Name <span className="text-danger">*</span></label>
                            <input type="text" style={{ width: "100%" }} value={microscopeName} onChange={handleChangeMicroscopeName} placeholder="required field, e.g. 4DN Microscope" />
                        </div>
                    </div>
                </div>
                {/* <div className="row">
                    <div className="col-sm-12 col-md-12">
                        <div className="form-group">
                            <label htmlFor="validation_tier">Validation Tier <span className="text-danger">*</span></label>
                            <DropdownButton id="validation-tier-selector" onSelect={handleChangeMicroscopeValidationTier}
                                title={'Tier ' + validationTier}>
                                {validationTierOptions.map((opt, i) => (
                                    <DropdownItem key={opt} eventKey={opt} data-key={opt}>
                                        {'Tier ' + opt}
                                    </DropdownItem>
                                ))}
                            </DropdownButton>
                        </div>
                    </div>
                </div> */}
            </Modal.Body>
            <Modal.Footer>
                <button type="button" onClick={handleModalConfirm} className="btn btn-success" disabled={!microscopeName}>
                    <i className={"icon icon-fw icon-" + (confirmLoading ? 'circle-notch icon-spin fas' : 'clone far')} />Submit
                </button>
                <button type="button" onClick={handleModalCancel} className="btn btn-outline-warning">
                    <i className="icon icon-fw icon-times mr-05 fas" />Cancel
                </button>
            </Modal.Footer>
        </Modal>
    );
});