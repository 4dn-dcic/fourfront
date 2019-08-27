'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import { DropdownButton, DropdownItem } from 'react-bootstrap';
import DefaultItemView from './DefaultItemView';
import { console, layout, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { Checkbox } from '@hms-dbmi-bgm/shared-portal-components/src/components/forms/components/Checkbox';
import { Alerts } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/Alerts';
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
            sex: gender = "undetermined",
            father = {},
            mother = {},
            is_deceased = false
        } = individual;

        // TODO throw error if some expected values not present

        return {
            id, gender, name,
            'father' : father['@id'] || null,
            'mother' : mother['@id'] || null,
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

    static getDerivedStateFromProps(props, state){
        return null;
    }

    constructor(props){
        super(props);
        this.handleFamilySelect = this.handleFamilySelect.bind(this);
        this.memoized = {
            parseFamilyIntoDataset : memoize(parseFamilyIntoDataset)
        };
        if (!(Array.isArray(props.context.families) && props.context.families.length > 0)){
            throw new Error("Expected props.context.families to be a non-empty Array.");
        }
        this.state = {
            currentFamilyIdx : 0,
            families: props.context.families
        };
    }

    handleFamilySelect(key){
        this.setState({ 'currentFamilyIdx' : parseInt(key) });
    }

    render(){
        const { context, schemas, windowWidth, windowHeight, innerOverlaysContainer, href } = this.props;
        const { currentFamilyIdx, families = [] } = this.state;
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
        this.state = {
            loading: false
        };
    }

    handleChange(e){
        const file = e.target.files[0];
        this.setState({ loading: true }, ()=>{
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
                        this.setState({ loading: false }, function(){
                            Alerts.queue({
                                "title" : "Error reading pedigree file",
                                "message" : "Check your file and try again.",
                            });
                        });
                        return data;
                    }).catch((data)=>{
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
        const { context : { actions = [] } } = this.props;
        const { loading } = this.state;
        const hasEditPermission = _.find(actions, { 'name' : 'edit' });
        if (!hasEditPermission){
            return null;
        }
        const innerLabel = (
            loading ? (
                <label className="text-400 mb-0 btn btn-outline-dark disabled" tabIndex={0}>
                    <i className="icon icon-fw fas icon-circle-notch icon-spin"/>
                </label>
            ) : (
                <label className="text-400 mb-0 btn btn-outline-dark clickable" htmlFor="test_pedigree" tabIndex={0}>
                    Upload new pedigree
                </label>
            )
        );
        return(
            <React.Fragment>
                <input id="test_pedigree" type="file" onChange={this.handleChange} className="d-none" accept="*/*" />
                { innerLabel }
            </React.Fragment>
        );
    }
}

