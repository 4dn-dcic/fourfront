'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { DropdownButton, MenuItem, Checkbox, Button } from 'react-bootstrap';
import { CollapsibleItemViewButtonToolbar } from './CollapsibleItemViewButtonToolbar';

export class WorkflowGraphSectionControls extends React.Component {

    static analysisStepsSet(context){
        if (!Array.isArray(context.steps)) return false;
        if (context.steps.length === 0) return false;
        return true;
    }

    static defaultProps = {
        'enabledControls' : [
            'referenceFilesCheckbox',
            'parametersCheckbox',
            'chartTypeDropdown',
            'rowSpacingTypeDropdown'
        ]
    };

    /*** Controls for all Workflow graphs ***/

    static keyTitleMap = {
        'detail'    : 'Analysis Steps',
        'basic'     : 'Basic Inputs & Outputs',
        'cwl'       : 'CWL Graph'
    };

    chartTypeDropdown(){
        var detail = WorkflowGraphSectionControls.analysisStepsSet(this.props.context) ? (
            <MenuItem eventKey='detail' active={this.props.showChartType === 'detail'}>
                Analysis Steps
            </MenuItem>
        ) : null;
    
        var basic = (
            <MenuItem eventKey='basic' active={this.props.showChartType === 'basic'}>
                Basic Inputs & Outputs
            </MenuItem>
        );

        return (
            <DropdownButton id="detail-granularity-selector" key="chart-type"
                className="for-state-showChart" pullRight
                onSelect={this.props.onChangeShowChartType}
                title={WorkflowGraphSectionControls.keyTitleMap[this.props.showChartType]}>
                { basic }{ detail }
            </DropdownButton>
        );
    }

    rowSpacingTypeDropdown(){
        if (typeof this.props.rowSpacingType !== 'string' || typeof this.props.onChangeRowSpacingType !== 'function') {
            return null;
        }
        return (
            <RowSpacingTypeDropdown currentKey={this.props.rowSpacingType} onSelect={this.props.onChangeRowSpacingType} key="row-spacing-type"/>
        );
    }

    fullScreenButton(){
        var { fullscreenViewEnabled, onToggleFullScreenView } = this.props;
        if( typeof fullscreenViewEnabled === 'boolean' && typeof onToggleFullScreenView === 'function'){
            return (
                <Button onClick={onToggleFullScreenView} className="for-state-fullscreenViewEnabled"
                    data-tip={!fullscreenViewEnabled ? 'Expand to full screen' : null} key="full-screen-btn">
                    <i className={"icon icon-fw icon-" + (!fullscreenViewEnabled ? 'expand' : 'compress')}/>
                </Button>
            );
        }
        return null;
    }

    referenceFilesCheckbox(){
        if (typeof this.props.showReferenceFiles !== 'boolean' || typeof this.props.onToggleReferenceFiles !== 'function') return null;
        return (
            <Checkbox checked={this.props.showReferenceFiles} onChange={this.props.onToggleReferenceFiles} key="ref-files-checkbox"
                disabled={this.props.isReferenceFilesCheckboxDisabled} className="checkbox-container for-state-showReferenceFiles">
                Show Reference Files
            </Checkbox>
        );
    }

    /*** Control for Workflow or WorkflowRun View only ***/

    parametersCheckbox(){
        if (typeof this.props.showParameters !== 'boolean' || typeof this.props.onToggleShowParameters !== 'function'){
            return null;
        }
        return (
            <Checkbox checked={this.props.showParameters} onChange={this.props.onToggleShowParameters}
                className="checkbox-container for-state-showParameters" key="params-checkbox">
                Show Parameters
            </Checkbox>
        );
    }

    /*** Controls for Provenance Graphs ***/

    indirectFilesCheckbox(){
        if (typeof this.props.showIndirectFiles !== 'boolean' || typeof this.props.onToggleIndirectFiles !== 'function') return null;
        return (
            <Checkbox checked={this.props.showIndirectFiles} onChange={this.props.onToggleIndirectFiles}
                disabled={this.props.isShowMoreContextCheckboxDisabled} className="checkbox-container"
                key="show-indirect-files-checkbox">
                Show More Context
            </Checkbox>
        );
    }

    allRunsCheckbox(){
        if (typeof this.props.allRuns !== 'boolean' || typeof this.props.onToggleAllRuns !== 'function') return null;
        return (
            <Checkbox checked={!this.props.allRuns && !this.props.isAllRunsCheckboxDisabled} onChange={this.props.onToggleAllRuns}
                disabled={this.props.isAllRunsCheckboxDisabled} className="checkbox-container" key="show-all-runs-checkbox">
                { this.props.loading ? <i className="icon icon-spin icon-fw icon-circle-o-notch" style={{ marginRight : 3 }}/> : '' } Collapse Similar Runs
            </Checkbox>
        );
    }

    /**
     * @param {...JSX.Element} element - Element(s) to wrap in controls wrapper.
     * @returns {JSX.Element} Workflow Controls Element.
     */
    wrapper(elems){
        return (
            <CollapsibleItemViewButtonToolbar
                children={elems}
                constantButtons={this.fullScreenButton()}
                windowWidth={this.props.windowWidth} />
        );
    }

    render(){
        var { enabledControls } = this.props;
        return this.wrapper(_.map(enabledControls, (ctrlFuncName) => this[ctrlFuncName]()));
    }
}


export class RowSpacingTypeDropdown extends React.Component {
    
    static propTypes = {
        'onSelect' : PropTypes.func.isRequired,
        'currentKey' : PropTypes.oneOf([ 'compact', 'wide', 'stacked' ])
    };

    static titleMap = {
        'stacked' : 'Stack Nodes',
        'compact' : 'Center Nodes',
        'wide' : 'Spread Nodes'
    };

    render(){
        var currentKey = this.props.currentKey,
            menuItems = _.map(_.keys(RowSpacingTypeDropdown.titleMap), function(k){
                return  <MenuItem eventKey={k} active={currentKey === k} children={RowSpacingTypeDropdown.titleMap[k]} />;
            });

        return (
            <DropdownButton id={this.props.id || "rowspacingtype-select"}
                pullRight onSelect={this.props.onSelect} title={RowSpacingTypeDropdown.titleMap[currentKey]}>
                { menuItems }
            </DropdownButton>
        );
    }

}
