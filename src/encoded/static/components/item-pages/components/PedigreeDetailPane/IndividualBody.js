'use strict';

import React from 'react';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { Fade } from 'react-bootstrap';
import memoize from 'memoize-one';
import { object, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';


export function getIndividualDisplayTitle(individual){
    const { name, id, data : { individualItem = null } } = individual;
    const { display_title } = individualItem || {};
    return display_title || name || id;
}

/**
 * At some point, will likely make into class component
 * and add methods to save/load things such as clinician notes.
 */
export class IndividualBody extends React.PureComponent {

    constructor(props){
        super(props);
        this.loadIndividual = this.loadIndividual.bind(this);
        this.state = {
            loadedIndividual: null,
            isLoadingIndividual: false,
            timestamp: 0
        };
        this.currRequest = null;
    }

    componentDidMount(){
        this.loadIndividual();
    }

    componentWillUnmount(){
        this.currRequest && this.currRequest.abort && this.currRequest.abort();
    }

    componentDidUpdate(pastProps){
        const { selectedNode, session } = this.props;
        if (pastProps.selectedNode !== selectedNode || session !== pastProps.session){
            this.loadIndividual({ loadedIndividual: null });
        }
    }

    loadIndividual(extraStateChange){
        const { selectedNode = {} } = this.props;
        const { data : { individualItem = null } } = selectedNode;
        const { '@id' : id } = individualItem || {};
        if (!id) {
            console.error("Couldnt get ID of individual");
            return;
        }
        let ourRequest = null;
        const timestamp = parseInt(Date.now());
        const cb = (res, xhr) => {
            if (xhr.status === 0 || ourRequest !== this.currRequest){
                return; // Aborted, skip state change.
            }
            this.currRequest = null;
            if (!res || res['@id'] !== id){
                // Error, maybe no permissions
                this.setState({ loadedIndividual : null, isLoadingIndividual: false });
                return;
            }
            this.setState({
                loadedIndividual : res,
                isLoadingIndividual: false,
                timestamp
            });
        };

        this.setState({ ...extraStateChange, isLoadingIndividual : true }, ()=>{
            this.currRequest && this.currRequest.abort && this.currRequest.abort();
            ourRequest = this.currRequest = ajax.load(id + "?ts=" + timestamp, cb, 'GET', cb);
        });
    }

    render(){
        const {
            selectedNode: individual,
            onNodeClick,
            onClose,
            diseaseToIndex,
            session
        } = this.props;
        const {
            isLoadingIndividual,
            loadedIndividual: loadedIndividualItem,
            timestamp
        } = this.state;
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
            phenotypic_features = [],
            actions = []
        } = loadedIndividualItem || individualItem || {};

        const haveEditPermission = session && _.any(actions, { "name" : "edit" });

        let showTitle = getIndividualDisplayTitle(individual);
        if (individualID) {
            showTitle = <a href={individualID}>{ showTitle }</a>;
        }

        console.log("INDV", loadedIndividualItem, individualItem);

        return (
            <div className="detail-pane-inner">

                <div className="title-box">
                    <div className="label-row row">
                        <div className="col">
                            <label>Individual</label>
                        </div>
                        <div className="col-auto buttons-col">
                            { haveEditPermission ?
                                <a href={individualID + "?currentAction=edit"} className="d-block edit-btn">
                                    <i className="icon icon-pencil fas clickable" />
                                </a>
                                : isLoadingIndividual ?
                                    <i className="icon icon-circle-notch icon-spin fas d-block mr-15" />
                                    : null }
                            { onClose ? <i className="icon icon-times fas clickable d-block" onClick={onClose}/> : null }
                        </div>
                    </div>
                    <h3>{ showTitle }</h3>
                </div>

                <div className="details">
                    { ethnicity ? <InlineDetailRow label="Ethnicity" value={ethnicity} /> : null }
                    <PhenotypicFeatures features={phenotypic_features} diseaseToIndex={diseaseToIndex} />
                    <ClinicianNotes individual={loadedIndividualItem || individualItem} haveEditPermission={haveEditPermission} />
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
        const diseaseIndex = diseaseToIndex[featureID] || -1;
        return (
            <div className="detail-row-list-item phenotypic-feature" key={featureID}>
                <div className="legend-patch" data-disease-index={diseaseIndex} />
                <span className="title"><a href={featureID}>{ title }</a></span>
                { onset_age !== null && onset_age_units !== null ? (
                    <span className="onset" data-tip="Age of onset">
                        <small> @ </small>
                        { "" + onset_age + " " + onset_age_units + (onset_age > 1 ? "s" : "") }
                    </span>
                ) : null }
            </div>
        );
    });
    return (
        <div className="detail-row phenotypic-features" data-describing="phenotypic_features">
            <label className="d-block">Phenotypic Features</label>
            { renderedFeatures }
        </div>
    );
}


/**
 * Module-level const shared between all ClinicianNotes instances to locally save
 * not-yet-patched/saved notes.
 * We might want to make this a localStorage interface at some point, idk.
 */
const clinicianNoteWorkingDraftCache = {};
const clinicianNoteSavedCache = {};

class ClinicianNotes extends React.PureComponent {

    static initState(props){
        const { individual: { '@id' : id, clinic_notes: propOriginalNotes = "" } } = props;
        const originalNotes = clinicianNoteSavedCache[id] || propOriginalNotes;
        const notes = clinicianNoteWorkingDraftCache[id] || originalNotes;
        return {
            originalNotes,
            notes,
            isSaving: false
        };
    }

    constructor(props){
        super(props);
        this.onChange = this.onChange.bind(this);
        this.onSave = this.onSave.bind(this);
        this.onReset = this.onReset.bind(this);

        this.state = ClinicianNotes.initState(props);
    }

    componentDidUpdate(pastProps, pastState){
        const { individual: { clinic_notes: currPropNotes = "" } } = this.props;
        const { individual: { clinic_notes: pastPropNotes = "" } } = pastProps;

        if (currPropNotes !== pastPropNotes){
            // We could alternatively just use unique key for ClinicianNotes instances
            this.setState(ClinicianNotes.initState(this.props));
            return;
        }

        const { notes, originalNotes } = this.state;
        const { notes: pastNotes, originalNotes: pastOrigNotes } = pastState;
        const notesChanged = (notes !== (originalNotes || ""));
        const pastNotesChanged = (pastNotes !== (pastOrigNotes || ""));
        if (notesChanged && !pastNotesChanged) {
            ReactTooltip.rebuild();
        }
    }

    onChange(e){
        const { individual: { '@id' : id } } = this.props;
        const notes = clinicianNoteWorkingDraftCache[id] = e.target.value;
        this.setState({ notes });
    }

    onSave(e){
        e.preventDefault();
        e.stopPropagation();
        const { individual: { '@id' : id } } = this.props;
        const { notes, isSaving: alreadyIsSaving } = this.state;
        ReactTooltip.hide();
        if (alreadyIsSaving) return;
        this.setState({ isSaving: true }, ()=>{
            ajax.load(
                id,
                (res)=>{
                    console.info("Saved notes to " + id);
                    console.log(res);
                    delete clinicianNoteWorkingDraftCache[id];
                    clinicianNoteSavedCache[id] = notes;
                    this.setState({
                        originalNotes: notes,
                        isSaving: false
                    });
                },
                'PATCH',
                (err)=>{
                    console.error(err);
                    this.setState({ isSaving: false });
                },
                JSON.stringify({ clinic_notes : notes })
            );
        });
    }

    onReset(e){
        const { individual: { '@id' : id } } = this.props;
        delete clinicianNoteWorkingDraftCache[id];
        this.setState(function({ originalNotes }){
            return { notes: originalNotes };
        });
    }

    render(){
        const { haveEditPermission } = this.props;
        const { notes, originalNotes, isSaving } = this.state;
        const notesChanged = (notes !== (originalNotes || ""));

        if (!notes && !haveEditPermission) return null;

        return (
            <div className="detail-row" data-describing="clinic_notes">
                <label className="d-block">Clinical Notes</label>
                { haveEditPermission ?
                    <textarea value={notes} onChange={this.onChange} className={notesChanged ? "has-changed" : null}/>
                    :
                    <p className="read-only-notes">{ notes }</p>
                }
                { haveEditPermission && notesChanged ?
                    <div className="save-btn-container">
                        <button type="button" disabled={isSaving} className="btn btn-sm btn-success mt-02 mr-05" onClick={this.onSave}
                            data-tip="It may take a couple of minutes for changes to take effect">
                            { isSaving ?
                                <React.Fragment>
                                    <i className="icon icon-circle-notch fas icon-spin mr-08"/>
                                    Saving
                                </React.Fragment>
                                : "Save" }
                        </button>
                        <button type="button" disabled={isSaving} className="btn btn-sm btn-outline-dark mt-02" onClick={this.onReset}>
                            Reset
                        </button>
                    </div>
                    : null }
            </div>
        );
    }
}

