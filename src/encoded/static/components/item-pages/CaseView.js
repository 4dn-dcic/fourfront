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
import { PedigreeDetailPane } from './components/PedigreeDetailPane';
import { Schemas } from './../util';



/**
 * Parses `context.families` instance
 * into list of Individuals (JSON objects) with
 * PedigreeViz-compliant properties.
 */
export function parseFamilyIntoDataset(family, diseasesAllowed = null){
    const { members = [], proband, original_pedigree } = family;
    const probandID = (proband && (typeof proband === 'string' ? proband : proband['@id'])) || null;
    return members.map(function(individual){
        const {
            "@id": id,
            display_title: name,
            sex: gender = "undetermined",
            father = null, // We might get these back as strings from back-end response, instd of embedded obj.
            mother = null,
            is_deceased: isDeceased = false,
            is_pregnancy: isPregnancy = false,
            is_termination_of_pregnancy: isTerminatedPregnancy = false,
            is_spontaneous_abortion: isSpontaneousAbortion = false,
            is_still_birth: isStillBirth = false,
            phenotypic_features = [],
            age = null, age_units = null,
            age_at_death = null, age_at_death_units = null
        } = individual;

        const fatherStr = (father && (typeof father === 'string' ? father : father['@id'])) || null;
        const motherStr = (mother && (typeof mother === 'string' ? mother : mother['@id'])) || null;

        // Internally, PedigreeViz uses the "diseases" vocabulary per a pedigree standards doc.
        // Here we transform phenotypic_features to this vocab (might change later, and/or conditionally)
        /*
        let diseasesAllowedObj = null;
        if (Array.isArray(diseasesAllowed) && diseasesAllowed.length > 0){
            diseasesAllowedObj = {};
            diseasesAllowed.forEach(function(d){
                diseasesAllowedObj[d] = true;
            });
        }
        */

        const diseases = []; // All strings
        const carrierOfDiseases = [];
        const asymptoticDiseases = [];

        phenotypic_features.forEach(function(featureWrapper){
            const feature = (featureWrapper && featureWrapper.phenotypic_feature) || null;
            const featureID = (feature && (typeof feature === 'string' ? feature : feature['@id'])) || null;
            if (!featureID) return;
            /*
            if (diseasesAllowedObj && !diseasesAllowedObj[featureID]) {
                return;
            }
            */
            diseases.push(featureID);
        });

        function calcAgeNum(ageNum, units){
            if (units === 'months') {
                return ageNum * (1/12);
            }
            if (units === 'weeks') {
                return ageNum * (1/52);
            }
            if (units === 'days') {
                return ageNum * (1/365);
            }
            if (units === 'hours') {
                return ageNum * (1/(365 * 24));
            }
            return ageNum;
        }

        let showAgeText = null;
        let ageNumerical = age_at_death || age;
        if (typeof age_at_death === 'number' && age_at_death_units){
            showAgeText = "" + age_at_death + " " + age_at_death_units + (age_at_death > 1 ? "s" : "");
            ageNumerical = calcAgeNum(age_at_death, age_at_death_units);
        } else if (typeof age === 'number' && age_units) {
            showAgeText = "" + age + " " + age_units + (age > 1 ? "s" : "");
            ageNumerical = calcAgeNum(age, age_units);
        }

        return {
            id, gender, name,
            isDeceased : isDeceased || isTerminatedPregnancy || isSpontaneousAbortion || isStillBirth || false,
            isPregnancy : isPregnancy || isTerminatedPregnancy || isSpontaneousAbortion || isStillBirth || false,
            isTerminatedPregnancy,
            isSpontaneousAbortion,
            isStillBirth,
            diseases,
            'ageText' : showAgeText || ageNumerical,
            'age' : ageNumerical,
            'father' : fatherStr,
            'mother' : motherStr,
            'isProband' : probandID && probandID === id,
            'data' : {
                // Keep non-proband-viz specific data here. TODO: Define/document.
                'individualItem' : individual
            }
        };
    });
}


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
        const pedigreeFamilies = (props.context.families || []).filter(CaseView.haveFullViewPermissionForFamily);
        this.state = {
            ...this.state,
            pedigreeFamilies,
            pedigreeFamiliesIdx: 0 // Maybe should be most recent/last index, idk, tbd.
        };
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
        const familiesLen = pedigreeFamilies.length;
        const initTabs = [];

        if (familiesLen > 0){
            // Remove this outer if condition if wanna show disabled '0 Pedigrees' tab instead

            initTabs.push(PedigreeTabView.getTabObject({
                ...this.props,
                ...this.state, // pedigreeFamilies & pedigreeFamiliesIdx
                handleFamilySelect: this.handleFamilySelect
            }));

        }

        if (familiesLen > 0){
            // Remove this outer if condition if wanna show disabled 'Pedigree Summary' tab instead

            initTabs.push(ProcessingSummaryTabView.getTabObject({
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


const ProcessingSummaryTabView = React.memo(function ProcessingSummaryTabView(props){
    const { pedigreeFamilies: families = [] } = props;
    const familiesLen = families.length;
    return (
        <div className="container-wide">
            <h3 className="tab-section-title">
                <span>Processing Summary</span>
            </h3>
            <hr className="tab-section-title-horiz-divider"/>
            {
                families.map(function(family, idx){
                    const { original_pedigree: { display_title: pedFileName } = {} } = family;
                    const cls = "summary-table-container family-index-" + idx;
                    const title = familiesLen === 1 ? null : (
                        <h4>
                            { "Family " + (idx + 1) }
                            { pedFileName ? <span className="text-300">{ " (" + pedFileName + ")" }</span> : null }
                        </h4>
                    );
                    return (
                        <div className={cls} key={idx}>
                            { title }
                            <ProcessingSummaryTable {...family} idx={idx} />
                        </div>
                    );
                })
            }
        </div>
    );
});
ProcessingSummaryTabView.getTabObject = function(props){
    const { pedigreeFamilies: families = [] } = props;
    const familiesLen = families.length;
    return {
        'tab' : (
            <React.Fragment>
                <i className="icon icon-cogs fas icon-fw"/>
                <span>Processing Summary</span>
            </React.Fragment>
        ),
        'key' : 'processing-summary',
        'disabled' : familiesLen === 0,
        'content' : <ProcessingSummaryTabView {...props} />
    };
};

const ProcessingSummaryTable = React.memo(function ProcessingSummaryTable(props){
    const {
        members = [],
        proband: { '@id' : probandID } = {},
        original_pedigree = null
    } = props;

    if (members.length === 0){
        return (
            <div className="processing-summary">
                <em>No members available.</em>
            </div>
        );
    }

    const columnOrder = [
        "individual",
        "sample",
        //"processedFileCount",
        "processedFiles",
        "rawFileCount",
        "sampleStatus"
    ];

    const columnTitles = {
        'individual' : "Individual",
        'sample' : "Sample",
        'processedFileCount' : "Processed Files",
        'processedFiles' : "Output File",
        'rawFileCount' : "Raw Files",
        'sampleStatus' : "Sample Status"
    };


    const rows = [];
    const membersWithoutSamples = [];
    const membersWithoutViewPermissions = [];

    // Gather rows from family.members - 1 per sample (or individual, if no sample).
    members.forEach(function(individual){
        const {
            display_title: indvDisplayTitle = null,
            '@id' : indvId,
            error = null,
            samples = []
        } = individual;

        if (!indvDisplayTitle || !indvId){
            membersWithoutViewPermissions.push(individual);
            /*
            rows.push({
                individual : <em>{ error || "No view permissions" }</em>,
                isProband: false,
                sample: <em>N/A</em>,
                processedFileCount: <em>N/A</em>,
                rawFileCount: <em>N/A</em>,
                sampleStatus: <em>N/A</em>
            });
            */
            return;
        }

        if (samples.length === 0){
            membersWithoutSamples.push(individual);
            /*
            rows.push({
                individual : indvLink,
                isProband: (probandID && probandID === indvId),
                sample: <em className="small" data-tip="No samples available for this individual">N/A</em>
            });
            */
            return;
        }

        const indvLink = <a href={indvId} className="accession">{ indvDisplayTitle }</a>;
        const isProband = (probandID && probandID === indvId);

        samples.forEach(function(sample, sampleIdx){
            const {
                '@id' : sampleID,
                display_title: sampleTitle,
                error: sampleErr = null,
                processed_files = [],
                files = [],
                status: sampleStatus
            } = sample;

            if (!sampleTitle || !sampleID){
                rows.push({
                    individual : indvLink,
                    isProband,
                    sample : <em>{ sampleErr || "No view permissions" }</em>,
                    sampleIdx
                });
                return;
            } else {
                rows.push({
                    individual : indvLink,
                    isProband,
                    sample: <a href={sampleID} className="accession">{ sampleTitle }</a>,
                    processedFileCount: processed_files.length,
                    processedFiles: processed_files,
                    rawFileCount: files.length,
                    sampleIdx,
                    sampleStatus: (
                        <span>
                            <i className="item-status-indicator-dot mr-05" data-status={sampleStatus}/>
                            { Schemas.Term.toName("status", sampleStatus) }
                        </span>
                    )
                });
            }
        });

    });

    const membersWithoutSamplesLen = membersWithoutSamples.length;
    const membersWithoutViewPermissionsLen = membersWithoutViewPermissions.length;

    const renderedSummary = (membersWithoutSamplesLen + membersWithoutViewPermissionsLen) > 0 ? (
        <div className="processing-summary">
            { membersWithoutSamplesLen > 0 ?
                <p className="mb-0">{ (membersWithoutSamplesLen + " members without samples.") }</p>
                /*
                <React.Fragment>
                    <p className="mb-0">{ (membersWithoutSamplesLen + " members without samples: ") }</p>
                    {
                        membersWithoutSamples.map(function(member, idx){
                            const { '@id' : id, display_title } = member;
                            return (
                                <React.Fragment key={id}>
                                    { idx !== 0 ? ", " : null }
                                    <a href={id}>{ display_title }</a>
                                </React.Fragment>
                            );
                        })
                    }
                </React.Fragment>
                */
                : null }
            { membersWithoutViewPermissionsLen > 0 ?
                <p className="mb-0">{ (membersWithoutViewPermissionsLen + " members without view permissions.") }</p>
                : null }
        </div>
    ) : null;

    if (rows.length === 0){
        return renderedSummary;
    }

    const renderedRows = rows.map(function(row, rowIdx){
        const { isProband = false, sampleIdx } = row;
        const rowCls = "sample-row" + (isProband ? " is-proband" : "");
        const rowCols = columnOrder.map(function(colName){
            let colVal = row[colName] || " - ";
            if (colName === "processedFiles"){
                const filesWPermissions = row[colName].filter(function(file){
                    return file['@id'] && file.display_title;
                });
                const filesWPermissionsLen = filesWPermissions.length;
                if (filesWPermissionsLen === 0){
                    colVal = " - ";
                } else if (filesWPermissionsLen === 1){
                    colVal = filesWPermissions[0];
                    colVal = <a href={colVal['@id']}>{ colVal.display_title }</a>;
                } else {
                    colVal = filesWPermissions[0];
                    colVal = (
                        <span>
                            <a href={colVal['@id']}>{ colVal.display_title }</a>
                            { "+ " + ( filesWPermissions[0].length - 1 ) + " more" }
                        </span>
                    );
                }
            }
            return (
                <td key={colName} data-for-column={colName}
                    data-tip={isProband && colName === "individual" ? "Proband" : null}
                    className={typeof row[colName] !== 'undefined' ? "has-value" : null}>
                    { colVal }
                </td>
            );
        });
        return <tr key={rowIdx} className={rowCls} data-sample-index={sampleIdx}>{ rowCols }</tr>;
    });

    const renderedTable = (
        <table className="processing-summary-table">
            <thead>
                <tr>
                    { columnOrder.map(function(colName){
                        return <th key={colName}>{ columnTitles[colName] }</th>;
                    }) }
                </tr>
            </thead>
            <tbody>{ renderedRows }</tbody>
        </table>
    );

    return (
        <React.Fragment>
            { renderedSummary }
            { renderedTable }
        </React.Fragment>
    );
});



/**
 * TabView that shows Pedigree(s) of Case families.
 * Specific to CaseView.
 */
class PedigreeTabView extends React.PureComponent {

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

    static getPhenotypicFeatureStrings(case_phenotypic_features = []){
        const strings = [];
        case_phenotypic_features.forEach(function(feature){
            const { '@id' : featureID } = feature;
            if (!featureID) return;
            strings.push(featureID);
        });
        return strings;
    }

    constructor(props){
        super(props);
        this.renderDetailPane = this.renderDetailPane.bind(this);
        this.memoized = {
            parseFamilyIntoDataset : memoize(parseFamilyIntoDataset),
            getPhenotypicFeatureStrings : memoize(PedigreeTabView.getPhenotypicFeatureStrings)
        };
        if (!(Array.isArray(props.context.families) && props.context.families.length > 0)){
            throw new Error("Expected props.context.families to be a non-empty Array.");
        }
    }

    renderDetailPane(pedigreeVizProps){
        const { session, href, context } = this.props;
        return <PedigreeDetailPane {...pedigreeVizProps} {...{ session, href, context }} />;
    }

    render(){
        const {
            context : {
                families: contextFamilies = [],
                case_phenotypic_features = []
            },
            schemas, windowWidth, windowHeight, innerOverlaysContainer, href,
            handleFamilySelect, pedigreeFamiliesIdx, pedigreeFamilies
        } = this.props;

        const families = pedigreeFamilies || contextFamilies;
        const currentFamily = families[pedigreeFamiliesIdx];
        const phenotypicFeatureStrings = this.memoized.getPhenotypicFeatureStrings(case_phenotypic_features);

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
                <PedigreeTabViewBody {...{ dataset, windowWidth, windowHeight }}
                    renderDetailPane={this.renderDetailPane} visibleDiseases={phenotypicFeatureStrings} />
            </div>
        );
    }
}


/**
 * Given dataset and options, renders out a pedigree from dataset.
 * Reusable for any PedigreeTabView of any ItemView.
 * @todo Maybe move into item-pages/components? Maybe not.
 */
export function PedigreeTabViewBody({ dataset, windowWidth, windowHeight, renderDetailPane, visibleDiseases }){
    return (
        <FullHeightCalculator {...{ windowWidth, windowHeight }}>
            <PedigreeViz {...{ dataset, windowWidth, renderDetailPane, visibleDiseases }}
                width={windowWidth} filterUnrelatedIndividuals={false}>
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
                    const { original_pedigree: pf = null } = family;
                    const pedFileStr = pf && (" (" + pf.display_title + ")");
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
