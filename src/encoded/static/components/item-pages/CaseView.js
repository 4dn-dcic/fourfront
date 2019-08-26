'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import { DropdownButton, DropdownItem } from 'react-bootstrap';
import DefaultItemView from './DefaultItemView';
import { console, layout, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { Checkbox } from '@hms-dbmi-bgm/shared-portal-components/src/components/forms/components/Checkbox';
import { PedigreeViz } from './../viz/PedigreeViz';
import { CollapsibleItemViewButtonToolbar } from './components/CollapsibleItemViewButtonToolbar';
import url from 'url';


export default class CaseView extends DefaultItemView {

    getTabViewContents(){
        const { context : { families = [] } } = this.props;
        const initTabs = [];

        if (families.length > 0){ // Remove this outer if condition if wanna show disabled '0 Pedigrees' tab instead
            initTabs.push(PedigreeTabView.getTabObject(this.props));
        }

        return this.getCommonTabs().concat(initTabs);
    }

}


export function parseFamilyIntoDataset(family){
    const { members = [], proband: { "@id" : probandID } = {}, ped_file } = family;
    return members.map(function(individual){
        const {
            "@id": id,
            display_title: name,
            life_status = null,
            sex: gender = "undetermined",
            father = {},
            mother = {}
        } = individual;

        // TODO throw error if some expected values not present
        if (typeof life_status !== 'string') throw new Error("Expected type string for life_status property");

        return {
            id, gender, name,
            'father' : father['@id'] || null,
            'mother' : mother['@id'] || null,
            'isProband' : probandID && probandID === id,
            'deceased' : life_status !== 'alive',
            'data' : {
                // Keep non-proband-viz specific data here. TODO: Define/document.
                'individualItem' : individual
            }
        };
    });
}


export class PedigreeTabView extends React.PureComponent {

    static getTabObject(props){
        const { context : { families = [] } } = props;
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
        this.handleFamilySelect = this.handleFamilySelect.bind(this);
        this.memoized = {
            parseFamilyIntoDataset : memoize(parseFamilyIntoDataset)
        };
        this.state = {
            currentFamilyIdx : 0
        };
    }

    handleFamilySelect(key){
        this.setState({ 'currentFamilyIdx' : parseInt(key) });
    }

    render(){
        const { context, schemas, windowWidth, windowHeight, innerOverlaysContainer, href } = this.props;
        const { families = [] } = context;
        const { currentFamilyIdx } = this.state;
        const currentFamily = families[currentFamilyIdx];

        const dataset = this.memoized.parseFamilyIntoDataset(currentFamily);
        console.log('DDD', dataset);
        return (
            <div className="overflow-hidden">
                <div className="container-wide">
                    <h3 className="tab-section-title">
                        <span>Pedigree</span>
                        <CollapsibleItemViewButtonToolbar windowWidth={windowWidth}>
                            <FamilySelectionDropdown {...{ families, currentFamilyIdx }} onSelect={this.handleFamilySelect} />
                            <AttachmentInputBtn href={href} context={context} />
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

    // Hardcoded to avoid trying to measure heights of DOM elems and whatnot.
    // This is duplicated in CSS3 using calc() for more modern browsers. If changing,
    // make sure is changing in both places.

    let height = null;
    const surroundingComponentsHeight = 216; // 215 = footer (50) + navbar (41) + tab-section-title (78) + hr (1) + item page nav (46)
    const rgs = layout.responsiveGridState(windowWidth);
    if (rgs === 'md' || rgs === 'lg' || rgs === 'xl') {
        height = Math.max(windowHeight - surroundingComponentsHeight, 600);
    }
    return (
        <PedigreeViz overlaysContainer={innerOverlaysContainer}
            {...{ dataset, windowWidth, height, width: windowWidth }}
            filterUnrelatedIndividuals={false}>
        </PedigreeViz>
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
        <DropdownButton onSelect={onSelect} title={title} variant="outline-dark" className="mr-05">
            {
                families.map(function(family, i){
                    const { ped_file = null } = family;
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

class AttachmentInputBtn extends React.PureComponent {

    constructor(props){
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(e){
        const file = e.target.files[0];
        const attachment_props = {};
        const { context: { uuid: case_uuid }, href } = this.props;
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
                ajax.promise('/' + case_uuid + '/process-pedigree?config_uri=' + config_uri,
                    'PATCH', {}, JSON.stringify(attachment_props)).then((data) => {
                    console.log(data);
                });
            } else {
                alert('There was a problem reading the given file.');
                return;
            }
        };
    }

    render(){
        return(
            <React.Fragment>
                <input id="test_pedigree" type="file" onChange={this.handleChange} className="d-none" accept="*/*" />
                <label className="text-400 mb-0 btn btn-outline-dark" htmlFor="test_pedigree" tabIndex={0}>
                    Upload new pedigree
                </label>
            </React.Fragment>
        );
    }
}

