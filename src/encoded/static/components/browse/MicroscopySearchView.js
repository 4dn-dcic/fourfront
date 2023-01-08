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

let microMetaDependencies = null;

export default class MicroscopySearchView extends React.PureComponent {

    constructor(props) {
        super(props);

        this.handleModalCancel = this.handleModalCancel.bind(this);
        this.handleModalConfirm = _.throttle(this.handleModalConfirm.bind(this), 3000);
        this.handleChangeMicroscopeName = this.handleChangeMicroscopeName.bind(this);
        this.handleChangeDescription = this.handleChangeDescription.bind(this);
        this.handleChangeMicroscopeTier = this.handleChangeMicroscopeTier.bind(this);
        this.handleChangeMicroscopeStandType = this.handleChangeMicroscopeStandType.bind(this);
        this.handleImportFromFile = this.handleImportFromFile.bind(this);

        this.memoized = {
            transformedFacets: memoize(transformedFacets)
        };

        this.state = {
            mounted: false,
            showCreateConfModal: false,
            tier: 1,
            microscopeName: null,
            description: null,
            standType: null,
            importFromFile: false,
            fileContent: {},
            confirmLoading: false,
        };
    }

    componentDidMount(){

        const onComplete = () => {
            this.setState({ mounted: true });
        };

        if (!microMetaDependencies) {
            window.fetch = window.fetch || ajax.fetchPolyfill; // Browser compatibility polyfill

            setTimeout(()=>{
                // Load in Microscopy Metadata Tool libraries as separate JS file due to large size.
                // @see https://webpack.js.org/api/module-methods/#requireensure

                import(
                    /* webpackChunkName: "micrometa-dependencies" */
                    'micrometa-dependencies'
                ).then((loadedDeps) => {
                    const tempMicroMetaDependencies = loadedDeps;
                    window
                        .fetch(
                            "https://raw.githubusercontent.com/WU-BIMAC/4DNMetadataSchemaXSD2JSONConverter/master/versions/2-01-1/fullSchema.json"
                        )
                        .then(function (resp) {
                            return resp.text();
                        })
                        .then(function (respText) {
                            tempMicroMetaDependencies.schemas = JSON.parse(respText);
                            microMetaDependencies = tempMicroMetaDependencies;

                            onComplete();
                        });
                });
            });
        } else {
            onComplete();
        }
    }

    /** @todo Possibly move into own component instead of method, especially if state can move along with it. */
    createNewMicroscopeConfiguration() {
        const { context, currentAction } = this.props;
        const { mounted, showCreateConfModal, tier, microscopeName, description, standType, importFromFile, fileContent, confirmLoading } = this.state;

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
            tier, showCreateConfModal, microscopeName, description, standType, importFromFile, fileContent, confirmLoading,
            'handleChangeMicroscopeName': this.handleChangeMicroscopeName,
            'handleChangeDescription': this.handleChangeDescription,
            'handleChangeMicroscopeStandType': this.handleChangeMicroscopeStandType,
            'handleImportFromFile': this.handleImportFromFile,
            'handleModalConfirm': this.handleModalConfirm,
            'handleModalCancel': this.handleModalCancel
        };
        return (
            <React.Fragment>
                <div className="d-inline-block ml-1">
                    <CreateNewConfigurationDropDownButton {...buttonProps} disabled={!mounted} />
                </div>
                <CreateNewConfigurationModal {...modalProps} />
            </React.Fragment>
        );
    }

    handleModalCancel(evt) {
        this.setState({ showCreateConfModal: null });
    }

    handleModalConfirm() {
        const { microscopeName, description, tier, standType, importFromFile, fileContent } = this.state;
        const { microMetaAppVersion, schemas = [] } = microMetaDependencies;

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
        const standJson = stand && stand.json ? stand.json + ".json" : null;
        let modelVersion = '2.01.0'; //fallback
        if (schemas && Array.isArray(schemas) && schemas.length > 0) {
            const schema = _.find(schemas, (item) => item && item.ID && item.ID === standJson);
            if (schema && schema.modelVersion) {
                modelVersion = schema.modelVersion;
            }
        }

        const microscope = !importFromFile ? {
            "Name": microscopeName,
            "Schema_ID": "Instrument.json",
            "ID": uuidv4(),
            "Tier": tier,
            "ValidationTier": tier,
            "ModelVersion": modelVersion,
            "AppVersion": microMetaAppVersion || null,
            "MicroscopeStand": {
                "Name": microscopeName,
                "Schema_ID": standJson,
                "ID": uuidv4(),
                "Tier": tier,
                "ValidationTier": tier,
                "ModelVersion": modelVersion,
                "Description": description || ''
            },
            "components": [],
            "linkedFields": null,
            "ScalingFactor": 0.70
        } : fileContent;

        const payload = {
            'title': microscopeName,
            'description': description || '',
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
                        this.setState({ 'confirmLoading': false, 'showCreateConfModal': false }, () => {
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
        if (eventKey !== 'import-from-file') {
            this.setState({
                microscopeName: null,
                description: null,
                showCreateConfModal: true,
                tier: parseInt(eventKey),
                importFromFile: false
            });
        } else {
            this.setState({
                microscopeName: null,
                description: null,
                showCreateConfModal: true,
                tier: -1,
                importFromFile: true
            });
        }
    }

    handleChangeMicroscopeStandType(eventKey) {
        this.setState({
            standType: eventKey
        });
    }

    handleImportFromFile(eventKey) {
        const { files } = eventKey.target;
        const { validateMicroMetaMicroscope, schemas: microMetaSchemas } = microMetaDependencies;
        const { microscopeName } = this.state;

        const reader = new window.FileReader();
        reader.readAsText(files[0]);
        reader.onloadend = function (e) {
            if (e.target.result) {
                const str = e.target.result;
                let fileContent = JSON.parse(str);

                console.log('import - microscope:', fileContent);
                console.log('import - schemas:', microMetaSchemas);

                const isValid = validateMicroMetaMicroscope(fileContent, microMetaSchemas, true);
                if (!isValid) {
                    alert('ERROR: Microscope is invalid! Please try again.');
                    fileContent = null;
                }

                this.setState({
                    fileContent: fileContent,
                    microscopeName: (fileContent && fileContent.Name) || microscopeName
                });
            } else {
                this.setState({
                    fileContent: null
                });
                alert('ERROR: There was a problem reading the given file. Please try again.');
                return;
            }
        }.bind(this);
    }

    render() {
        const { isFullscreen, toggleFullScreen, href, context, currentAction, session, schemas } = this.props;
        const facets = this.memoized.transformedFacets(href, context, currentAction, session, schemas);
        const tableColumnClassName = "expset-result-table-fix col-12" + (facets.length > 0 ? " col-sm-7 col-lg-8 col-xl-" + (isFullscreen ? '10' : '9') : "");
        const facetColumnClassName = "facet-result-table-fix col-12 col-sm-5 col-lg-4 col-xl-" + (isFullscreen ? '2' : '3');
        const aboveTableComponent = (
            <AboveSearchViewTableControls {...{ isFullscreen, toggleFullScreen }}
                topLeftChildren={this.createNewMicroscopeConfiguration()} />
        );

        return (
            // TODO (low-ish priority): Pass in props.aboveTableComponent =  instead of props.topLeftChildren
            <div className="container" id="content">
                <CommonSearchView {...this.props} {...{ tableColumnClassName, facetColumnClassName, facets, aboveTableComponent }}
                    termTransformFxn={Schemas.Term.toName} separateSingleTermFacets keepSelectionInStorage
                    columnExtensionMap={microscopyColExtensionMap} />
            </div>
        );
    }
}


const CreateNewConfigurationDropDownButton = React.memo(function (props) {
    const { handleChangeMicroscopeTier, startTier, endTier, disabled } = props;
    const tierOptions = _.range(startTier, endTier + 1);
    return (
        <DropdownButton id="tier-selector" onSelect={handleChangeMicroscopeTier}
            title="Create New" size="xs" disabled={disabled}>
            {tierOptions.map((opt, i) => (
                <DropdownItem key={opt} eventKey={opt} data-key={opt}>
                    {'Tier ' + opt}
                </DropdownItem>
            ))}
            <DropdownItem key="import-from-file" eventKey="import-from-file" data-key="import-from-file">
                {'Import from file'}
            </DropdownItem>
        </DropdownButton>
    );
});

const CreateNewConfigurationModal = React.memo(function (props) {
    const {
        tier, standType, showCreateConfModal, microscopeName,
        description, importFromFile, fileContent, confirmLoading,
        handleChangeMicroscopeName, handleChangeMicroscopeStandType, handleChangeDescription, handleImportFromFile,
        handleModalConfirm, handleModalCancel } = props;

    const isSubmittable = importFromFile ? (microscopeName && fileContent && !_.isEmpty(fileContent)) : (microscopeName && standType);
    let fileClassName = 'form-control w-100';
    if (!fileContent) {
        fileClassName += ' has-error';
    } else if (!_.isEmpty(fileContent)) {
        fileClassName += ' has-success';
    }

    return (
        <Modal className="microscopy-create-modal" show={showCreateConfModal}>
            <Modal.Header>
                <Modal.Title>{importFromFile ? 'Import from file' : 'New Microscope - Tier ' + tier} </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {importFromFile ? (
                    <div className="row">
                        <div className="col-sm-12 col-md-12">
                            <div className="form-group">
                                <label htmlFor="import_file">Browse File <span className="text-danger">*</span></label>
                                <input id="import_file" type="file" className={fileClassName} onChange={handleImportFromFile} accept=".json" />
                            </div>
                        </div>
                    </div>) : null}
                <div className="row">
                    <div className="col-sm-12 col-md-12">
                        <div className="form-group">
                            <label htmlFor="microscope_name">Microscope Name <span className="text-danger">*</span></label>
                            <input id="microscope_name" type="text" className="form-control w-100" value={microscopeName} onChange={handleChangeMicroscopeName} placeholder="required field, e.g. 4DN Microscope" />
                        </div>
                    </div>
                </div>
                {!importFromFile ? (
                    <div className="row">
                        <div className="col-sm-12 col-md-12">
                            <div className="form-group">
                                <label htmlFor="validation_tier">Stand Type<span className="text-danger">*</span></label>
                                <DropdownButton id="validation_tier" onSelect={handleChangeMicroscopeStandType}
                                    title={standType || 'Select Stand Type'}>
                                    {current_stands.map((opt, i) => (
                                        <DropdownItem key={opt.name} eventKey={opt.name} data-key={opt.name}>
                                            {opt.name}
                                        </DropdownItem>
                                    ))}
                                </DropdownButton>
                            </div>
                        </div>
                    </div>) : null}
                {!importFromFile ? (
                    <div className="row">
                        <div className="col-sm-12 col-md-12">
                            <div className="form-group">
                                <label htmlFor="microscope_description">Description</label>
                                <input id="microscope_description" type="text" className="form-control w-100" value={description} onChange={handleChangeDescription} placeholder="microscope configuration description" />
                            </div>
                        </div>
                    </div>) : null}
            </Modal.Body>
            <Modal.Footer>
                <button type="button" onClick={handleModalConfirm} className="btn btn-success" disabled={!isSubmittable}>
                    <i className={"icon icon-fw icon-" + (confirmLoading ? 'circle-notch icon-spin fas' : 'clone far')} />Submit
                </button>
                <button type="button" onClick={handleModalCancel} className="btn btn-outline-warning">
                    <i className="icon icon-fw icon-times mr-05 fas" />Cancel
                </button>
            </Modal.Footer>
        </Modal>
    );
});
