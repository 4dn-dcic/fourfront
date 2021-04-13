'use strict';

import React from 'react';
import memoize from 'memoize-one';
import _ from 'underscore';
import DropdownItem from 'react-bootstrap/esm/DropdownItem';
import DropdownButton from 'react-bootstrap/esm/DropdownButton';
import Modal from 'react-bootstrap/esm/Modal';
import { v4 as uuidv4 } from 'uuid';

import { SearchView as CommonSearchView } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/SearchView';
import { AboveSearchViewTableControls } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/above-table-controls/AboveSearchViewTableControls';
import { console, ajax, navigate, object } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { Alerts } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Alerts';
import { current_stands } from 'micro-meta-app-react/es/constants';

import { columnExtensionMap } from './columnExtensionMap';
import { Schemas } from './../util';

import { transformedFacets } from './SearchView';



const microscopyColExtensionMap = {
    ...columnExtensionMap,
    "microscope.Tier": {
        "widthMap": { "sm": 50, "md": 70, "lg": 80 }
    },
    "microscope.MicroscopeStand.Manufacturer": {
        "widthMap": { "sm": 80, "md": 100, "lg": 120 }
    },
    "microscope.MicroscopeStand.Origin": {
        "widthMap": { "sm": 80, "md": 100, "lg": 120 }
    },
    "microscope.MicroscopeStand.Model": {
        "widthMap": { "sm": 80, "md": 100, "lg": 120 }
    },
    "microscope.MicroscopeStand.Type": {
        "widthMap": { "sm": 80, "md": 100, "lg": 120 }
    },
    "submitted_by.display_title": {
        "widthMap": { "sm": 100, "md": 100, "lg": 120 }
    }
};

export default class MicroscopySearchView extends React.PureComponent {

    constructor(props) {
        super(props);

        this.handleModalCancel = this.handleModalCancel.bind(this);
        this.handleModalConfirm = _.throttle(this.handleModalConfirm.bind(this), 3000);
        this.handleChangeMicroscopeName = this.handleChangeMicroscopeName.bind(this);
        this.handleChangeDescription = this.handleChangeDescription.bind(this);
        this.handleChangeMicroscopeTier = this.handleChangeMicroscopeTier.bind(this);
        this.handleChangeMicroscopeStandType = this.handleChangeMicroscopeStandType.bind(this);

        this.memoized = {
            transformedFacets: memoize(transformedFacets)
        };

        this.state = {
            show: false,
            tier: 1,
            microscopeName: null,
            description: null,
            standType: null,
            confirmLoading: false
        };
    }

    /** @todo Possibly move into own component instead of method, especially if state can move along with it. */
    createNewMicroscopeConfiguration() {
        const { context, currentAction } = this.props;
        const { show, tier, microscopeName, description, standType, confirmLoading } = this.state;

        let createNewVisible = false;
        // don't show during submission search "selecting existing"
        if (context && Array.isArray(context.actions) && !currentAction) {
            const addAction = _.findWhere(context.actions, { 'name': 'add' });
            if (addAction && typeof addAction.href === 'string') {
                createNewVisible = true;
            }
        }

        if (!createNewVisible) {
            return null;
        }

        const buttonProps = {
            'handleChangeMicroscopeTier': this.handleChangeMicroscopeTier,
            'startTier': 1,
            'endTier': 3
        };
        const modalProps = {
            tier, show, confirmLoading, microscopeName, description, standType,
            'handleChangeMicroscopeName': this.handleChangeMicroscopeName,
            'handleChangeDescription': this.handleChangeDescription,
            'handleChangeMicroscopeStandType': this.handleChangeMicroscopeStandType,
            'handleModalConfirm': this.handleModalConfirm,
            'handleModalCancel': this.handleModalCancel
        };
        return (
            <React.Fragment>
                <div className="d-inline-block ml-1">
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
        const { microscopeName, description, tier, standType } = this.state;

        const fallbackCallback = (errResp, xhr) => {
            // Error callback
            Alerts.queue({
                'title': "Failed to save configuration.",
                'message': "Sorry, can you try to save again?",
                'style': 'danger'
            });
            this.setState({ 'confirmLoading': false });
        };

        const stand = _.find(current_stands, (stand) => stand && stand.name && stand.name === standType);

        const microscope = {
            "Name": microscopeName,
            "Schema_ID": "Instrument.json",
            "ID": uuidv4(),
            "Tier": tier,
            "ValidationTier": tier,
            "ModelVersion": "2.00.0",
            "MicroscopeStand": {
                "Name": microscopeName,
                "Schema_ID": stand && stand.json ? stand.json + ".json" : null,
                "ID": uuidv4(),
                "Tier": tier,
                "ValidationTier": tier,
                "ModelVersion": "2.00.0",
                "Description": description
            },
            "components": [],
            "linkedFields": null
        };

        const payload = {
            'title': microscopeName,
            'description': description,
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

    handleChangeDescription(evt) {
        this.setState({ 'description': evt.target.value });
    }

    handleChangeMicroscopeTier(eventKey) {
        this.setState({
            show: true,
            tier: parseInt(eventKey)
        });
    }

    handleChangeMicroscopeStandType(eventKey) {
        this.setState({
            standType: eventKey
        });
    }

    render() {
        const { isFullscreen, toggleFullScreen, href, context, currentAction, session, schemas } = this.props;
        const facets = this.memoized.transformedFacets(href, context, currentAction, session, schemas);
        const tableColumnClassName = "expset-result-table-fix col-12" + (facets.length > 0 ? " col-sm-7 col-lg-8 col-xl-" + (isFullscreen ? '10' : '9') : "");
        const facetColumnClassName = "col-12 col-sm-5 col-lg-4 col-xl-" + (isFullscreen ? '2' : '3');
        const aboveTableComponent = (
            <AboveSearchViewTableControls {...{ isFullscreen, toggleFullScreen }}
                topLeftChildren={this.createNewMicroscopeConfiguration()} />
        );

        return (
            // TODO (low-ish priority): Pass in props.aboveTableComponent =  instead of props.topLeftChildren
            <div className="container" id="content">
                <CommonSearchView {...this.props} {...{ tableColumnClassName, facetColumnClassName, facets, aboveTableComponent }}
                    termTransformFxn={Schemas.Term.toName} separateSingleTermFacets columnExtensionMap={microscopyColExtensionMap} />
            </div>
        );
    }
}


const CreateNewConfigurationDropDownButton = React.memo(function (props) {
    const { handleChangeMicroscopeTier, startTier, endTier } = props;
    const tierOptions = _.range(startTier, endTier + 1);
    return (
        <DropdownButton id="tier-selector" onSelect={handleChangeMicroscopeTier}
            title="Create New Configuration" size="xs">
            {tierOptions.map((opt, i) => (
                <DropdownItem key={opt} eventKey={opt} data-key={opt}>
                    {'Tier ' + opt}
                </DropdownItem>
            ))}
        </DropdownButton>
    );
});

const CreateNewConfigurationModal = React.memo(function (props) {
    const { tier, standType, show, confirmLoading, microscopeName, description, handleChangeMicroscopeName, handleChangeMicroscopeStandType, handleChangeDescription, handleModalConfirm, handleModalCancel } = props;
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
                            <input type="text" className="form-control" style={{ width: "100%" }} value={microscopeName} onChange={handleChangeMicroscopeName} placeholder="required field, e.g. 4DN Microscope" />
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 col-md-12">
                        <div className="form-group">
                            <label htmlFor="validation_tier">Stand Type<span className="text-danger">*</span></label>
                            <DropdownButton id="validation-stand-type-selector" onSelect={handleChangeMicroscopeStandType}
                                title={standType || 'Select Stand Type'}>
                                {current_stands.map((opt, i) => (
                                    <DropdownItem key={opt.name} eventKey={opt.name} data-key={opt.name}>
                                        {opt.name}
                                    </DropdownItem>
                                ))}
                            </DropdownButton>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12 col-md-12">
                        <div className="form-group">
                            <label htmlFor="microscope_name">Description</label>
                            <input type="text" className="form-control" style={{ width: "100%" }} value={description} onChange={handleChangeDescription} placeholder="microscope configuration description" />
                        </div>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button type="button" onClick={handleModalConfirm} className="btn btn-success" disabled={!microscopeName || !standType}>
                    <i className={"icon icon-fw icon-" + (confirmLoading ? 'circle-notch icon-spin fas' : 'clone far')} />Submit
                </button>
                <button type="button" onClick={handleModalCancel} className="btn btn-outline-warning">
                    <i className="icon icon-fw icon-times mr-05 fas" />Cancel
                </button>
            </Modal.Footer>
        </Modal>
    );
});
