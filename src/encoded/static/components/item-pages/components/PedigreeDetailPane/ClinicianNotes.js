'use strict';

import React from 'react';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';

/**
 * Module-level consts shared between all ClinicianNotes instances to locally save
 * not-yet-patched/saved notes.
 * We might want to make this a localStorage interface at some point, idk.
 *
 * @private
 */
let contextForCache = null;
const clinicianNoteWorkingDraftCache = {};
const clinicianNoteSavedCache = {};

export class ClinicianNotes extends React.PureComponent {

    static initState(props){
        const { context, individual: { '@id' : id, clinic_notes: propOriginalNotes = "" } } = props;

        if (contextForCache && context && contextForCache !== context){
            // If context reference changes, then clear saved note cache.
            // Is assumed that (newer) prop.context would be most up-to-date from server.
            contextForCache = context;
            Object.keys(clinicianNoteSavedCache).forEach(function(k){
                delete clinicianNoteSavedCache[k];
            });
        }

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
        const { individual: currIndv } = this.props;
        const { individual: pastIndv } = pastProps;
        const { clinic_notes: currPropNotes = "" } = currIndv || {};
        const { clinic_notes: pastPropNotes = "" } = pastIndv || {};


        if (currIndv !== pastIndv || currPropNotes !== pastPropNotes){
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
