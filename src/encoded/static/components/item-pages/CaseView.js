'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import url from 'url';
import { DropdownButton, DropdownItem } from 'react-bootstrap';
import DefaultItemView from './DefaultItemView';
import { console, layout, ajax, object } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { Checkbox } from '@hms-dbmi-bgm/shared-portal-components/src/components/forms/components/Checkbox';
import { Alerts } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/Alerts';
import { PedigreeViz } from './../viz/PedigreeViz';
import { CollapsibleItemViewButtonToolbar } from './components/CollapsibleItemViewButtonToolbar';
import { FullHeightCalculator } from './components/FullHeightCalculator';



export default class CaseView extends DefaultItemView {

    static haveFullViewPermissionForFamily(family){
        const { original_pedigree = null, proband = null, members = [] } = family;
        if (original_pedigree && !object.isAnItem(original_pedigree)){
            // Tests for presence of display_title and @id, lack of which indicates lack of view permission.
            return false;
        }
        if (proband && !object.isAnItem(proband)){
            return false;
        }
        if (members.length === 0) {
            return false;
        }
        for (var i = 0; i < members.length; i++){
            if (!object.isAnItem(members[i])){
                return false;
            }
        }
        return true;
    }

    constructor(props){
        super(props);
        this.onAddedFamily = this.onAddedFamily.bind(this);
        this.handleFamilySelect = this.handleFamilySelect.bind(this);
        this.state.pedigreeFamilies = (props.context.families || []).filter(CaseView.haveFullViewPermissionForFamily);
        this.state.pedigreeFamiliesIdx = 0;
    }

    componentDidUpdate(pastProps, pastState){
        const { context } = this.props;
        if (pastProps.context !== context){
            const pedigreeFamilies = (context.families || []).filter(CaseView.haveFullViewPermissionForFamily);
            this.setState(function({ pedigreeFamiliesIdx: pastIdx }){
                return {
                    pedigreeFamilies,
                    pedigreeFamiliesIdx: (pedigreeFamilies.length > pastIdx ? pastIdx : 0)
                };
            });
        }
    }

    onAddedFamily(response){
        const { family: newFamily } = response;
        if (!newFamily) return;
        this.setState(function({ pedigreeFamilies }){
            const nextFamilies = pedigreeFamilies.slice(0);
            if (!CaseView.haveFullViewPermissionForFamily(newFamily)){
                return null; // Shouldn't occur given that User had permission to add in 1st place.
            }
            nextFamilies.push(newFamily);
            return {
                pedigreeFamilies: nextFamilies,
                pedigreeFamiliesIdx: nextFamilies.length - 1
            };
        });
    }

    handleFamilySelect(key){
        this.setState({ 'pedigreeFamiliesIdx' : parseInt(key) });
    }

    getTabViewContents(){
        const { context : { families = [] } } = this.props;
        const { pedigreeFamilies = [] } = this.state;
        const initTabs = [];

        if (pedigreeFamilies.length > 0){ // Remove this outer if condition if wanna show disabled '0 Pedigrees' tab instead
            initTabs.push(PedigreeTabView.getTabObject({
                ...this.props,
                ...this.state, // pedigreeFamilies & pedigreeFamiliesIdx
                handleFamilySelect: this.handleFamilySelect
            }));
        }

        return this.getCommonTabs().concat(initTabs);
    }

    /** Render additional item actions */
    additionalItemActionsContent(){
        const { context, href } = this.props;
        const hasEditPermission = _.find(context.actions || [], { 'name' : 'edit' });
        if (!hasEditPermission){
            return null;
        }
        return (
            <AttachmentInputController {...{ context, href }} onAddedFamily={this.onAddedFamily}>
                <AttachmentInputMenuOption />
            </AttachmentInputController>
        );
    }

}


export function parseFamilyIntoDataset(family){
    const { members = [], proband, ped_file } = family;
    return members.map(function(individual){
        const {
            "@id": id,
            display_title: name,
            sex: gender = "undetermined",
            father = null, // We might get these back as strings from back-end response, instd of embedded obj.
            mother = null,
            is_deceased = false
        } = individual;

        const fatherStr = (father && (typeof father === 'string' ? father : father['@id'])) || null;
        const motherStr = (mother && (typeof mother === 'string' ? mother : mother['@id'])) || null;
        const probandID = (proband && (typeof proband === 'string' ? proband : proband['@id'])) || null;

        return {
            id, gender, name,
            'father' : fatherStr,
            'mother' : motherStr,
            'isProband' : probandID && probandID === id,
            'deceased' : !!(is_deceased),
            'data' : {
                // Keep non-proband-viz specific data here. TODO: Define/document.
                'individualItem' : individual
            }
        };
    });
}


export class PedigreeTabView extends React.PureComponent {

    static getTabObject(props){
        const { pedigreeFamilies: families = [] } = props;
        const familiesLen = families.length;
        return {
            'tab' : (
                <React.Fragment>
                    <i className="icon icon-sitemap fas icon-fw"/>
                    <span>{ "" + familiesLen + " Pedigree" + (familiesLen > 1 ? "s" : "") }</span>
                </React.Fragment>
            ),
            'key' : 'pedigree',
            'disabled' : familiesLen === 0,
            'content' : <PedigreeTabView {...props} />
        };
    }


    constructor(props){
        super(props);
        this.memoized = {
            parseFamilyIntoDataset : memoize(parseFamilyIntoDataset)
        };
        if (!(Array.isArray(props.context.families) && props.context.families.length > 0)){
            throw new Error("Expected props.context.families to be a non-empty Array.");
        }
    }


    render(){
        const {
            context, schemas, windowWidth, windowHeight, innerOverlaysContainer, href,
            handleFamilySelect, pedigreeFamiliesIdx, pedigreeFamilies
        } = this.props;

        const families = pedigreeFamilies || context.families;
        const currentFamily = families[pedigreeFamiliesIdx];

        const dataset = this.memoized.parseFamilyIntoDataset(currentFamily);

        console.log('DDD', dataset);
        return (
            <div>
                <div className="container-wide">
                    <h3 className="tab-section-title">
                        <span>Pedigree</span>
                        <CollapsibleItemViewButtonToolbar windowWidth={windowWidth}>
                            <FamilySelectionDropdown {...{ families, currentFamilyIdx: pedigreeFamiliesIdx }} onSelect={handleFamilySelect} />
                        </CollapsibleItemViewButtonToolbar>
                    </h3>
                </div>
                <hr className="tab-section-title-horiz-divider"/>
                <PedigreeTabViewBody {...{ dataset, windowWidth, windowHeight, innerOverlaysContainer }} />
            </div>
        );
    }
}


export function PedigreeTabViewBody({ innerOverlaysContainer, dataset, windowWidth, windowHeight }){
    return (
        <FullHeightCalculator {...{ windowWidth, windowHeight }}>
            <PedigreeViz overlaysContainer={innerOverlaysContainer}
                {...{ dataset, windowWidth, width: windowWidth }}
                filterUnrelatedIndividuals={false}>
            </PedigreeViz>
        </FullHeightCalculator>
    );
}


const FamilySelectionDropdown = React.memo(function FamilySelectionDropdown(props){
    const { families, currentFamilyIdx = 0, onSelect } = props;
    if (families.length < 2) {
        return null;
    }
    const title = (
        <span>Family <strong>{currentFamilyIdx + 1}</strong></span>
    );
    return (
        <DropdownButton onSelect={onSelect} title={title} variant="outline-dark" className="mr-05" alignRight>
            {
                families.map(function(family, i){
                    const { original_pedigree: ped_file = null } = family;
                    const pedFileStr = ped_file && (" (" + ped_file.display_title + ")");
                    return (
                        <DropdownItem key={i} eventKey={i} active={i === currentFamilyIdx}>
                            Family {i + 1}{ pedFileStr }
                        </DropdownItem>
                    );
                })
            }
        </DropdownButton>
    );
});


class AttachmentInputController extends React.PureComponent {

    constructor(props){
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.state = {
            loading: false
        };
    }

    handleChange(e){
        const file = e.target.files[0];
        this.setState({ loading: true }, ()=>{
            const attachment_props = {};
            const { context: { uuid: case_uuid }, href, onAddedFamily } = this.props;
            const { host } = url.parse(href);
            let config_uri;
            if (host.indexOf('localhost') > -1){
                config_uri = 'development.ini';
            } else {
                config_uri = 'production.ini';
            }
            attachment_props.type = file.type;
            attachment_props.download = file.name;
            if (file.size) {
                attachment_props.size = file.size;
            }
            const fileReader = new window.FileReader();
            fileReader.readAsText(file);
            fileReader.onloadend = (e) => {
                if (e.target.result) {
                    attachment_props.href = e.target.result;
                    ajax.promise(
                        '/' + case_uuid + '/process-pedigree?config_uri=' + config_uri,
                        'PATCH',
                        {},
                        JSON.stringify(attachment_props)
                    ).then((data) => {
                        // TODO test if anything else wrong with response and throw if so.
                        if (!data || data.status === "error"){
                            throw data;
                        }
                        return data;
                    }).then((data)=>{
                        // todo
                        const {
                            case: caseItem,
                            family : {
                                members,
                                original_pedigree: {
                                    display_title: pedigreeTitle,
                                    '@id' : pedigreeID
                                } = {}
                            }
                        } = data;
                        this.setState({ loading: false }, function(){
                            let message = "Added family";
                            if (pedigreeTitle && pedigreeID){
                                message = (
                                    <span>
                                        Added family from pedigree <a href={pedigreeID}>{ pedigreeTitle }</a>
                                    </span>
                                );
                            }
                            Alerts.queue({
                                "title" : "Added family",
                                message,
                                "style" : "success"
                            });
                        });
                        return data;
                    }).then(onAddedFamily).catch((data)=>{
                        this.setState({ loading: false }, function(){
                            Alerts.queue({
                                "title" : "Error parsing pedigree file",
                                "message" : "Check your file and try again.",
                            });
                        });
                        console.error(data);
                    });
                } else {
                    this.setState({ loading: false }, function(){
                        Alerts.queue({
                            "title" : "Error reading pedigree file",
                            "message" : "Check your file and try again.",
                        });
                    });
                    return;
                }
            };
        });
    }

    render(){
        const { children, ...passProps }  = this.props;
        const { loading: loadingPedigreeResult }  = this.state;
        return React.Children.map(children, (c)=>
            React.cloneElement(c, { ...passProps, loadingPedigreeResult, onFileInputChange: this.handleChange })
        );
    }
}

const AttachmentInputMenuOption = React.memo(function AttachmentInputMenuOption(props){
    const { loadingPedigreeResult, onFileInputChange } = props;
    const icon = loadingPedigreeResult ? "circle-notch fas icon-spin" : "upload fas";
    return (
        <label className={"menu-option text-400" + (loadingPedigreeResult ? ' disabled' : ' clickable')}>
            <input id="test_pedigree" type="file" onChange={onFileInputChange} className="d-none" accept="*/*" />
            <div className="row">
                <div className="col-auto icon-container">
                    <i className={"icon icon-fw icon-" + icon}/>
                </div>
                <div className="col title-col">
                    <h5>Add Family</h5>
                    <span className="description">Upload a new pedigree file.</span>
                </div>
            </div>
        </label>
    );
});
