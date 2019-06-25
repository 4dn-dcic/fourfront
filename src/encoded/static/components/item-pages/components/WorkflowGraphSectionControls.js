'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Checkbox } from './../../forms/components/Checkbox';
import { DropdownButton, DropdownItem } from './../../forms/components/DropdownButton';
import { CollapsibleItemViewButtonToolbar } from './CollapsibleItemViewButtonToolbar';


export class WorkflowGraphSectionControls extends React.PureComponent {

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

    /**
     * Meant for all Workflow views.
     * Required props below --
     *
     * @prop {Object} context - JSON of Item containing workflow steps.
     * @prop {string} showChartType - Type of chart shown. 'Detail' and 'basic' supported.
     * @prop {function} onChangeShowChartType - Callback accepting key of new chart type.
     */
    rowSpacingTypeDropdown(){
        if (typeof this.props.rowSpacingType !== 'string' || typeof this.props.onChangeRowSpacingType !== 'function') {
            return null;
        }
        return (
            <RowSpacingTypeDropdown currentKey={this.props.rowSpacingType} onSelect={this.props.onChangeRowSpacingType} key="row-spacing-type"/>
        );
    }

    /**
     * Renders full screen toggle button.
     * Is present on all controls by default unless `props.isFullscreen` is false.
     * Required props below -
     *
     * @prop {boolean} isFullscreen - Whether we're full screen. Should be passed down from BodyElement.
     * @prop {function} onToggleFullScreenView - Callback to toggle full screen state. Should be passed from BodyElement.
     */
    fullScreenButton(){
        var { isFullscreen, onToggleFullScreenView } = this.props;
        if (typeof isFullscreen === 'boolean' && typeof onToggleFullScreenView === 'function'){
            return (
                <button type="button" onClick={onToggleFullScreenView} key="full-screen-btn"
                    className="btn btn-outline-secondary for-state-fullscreenViewEnabled"
                    data-tip={!isFullscreen ? 'Expand to full screen' : null}>
                    <i className={"icon icon-fw icon-" + (!isFullscreen ? 'expand' : 'compress')}/>
                </button>
            );
        }
        return null;
    }

    /**
     * Required props below -
     *
     * @prop {boolean} showReferenceFiles - Whether we're showing reference files.
     * @prop {function} onToggleReferenceFiles - Callback to toggle visibility of reference files state.
     * @prop {boolean} isReferenceFilesCheckboxDisabled - Optional flag to show checkbox as disabled (e.g. no reference files present).
     */
    referenceFilesCheckbox(){
        var { showReferenceFiles, onToggleReferenceFiles, isReferenceFilesCheckboxDisabled } = this.props;
        if (typeof showReferenceFiles !== 'boolean' || typeof onToggleReferenceFiles !== 'function') return null;
        return (
            <Checkbox checked={showReferenceFiles} onChange={onToggleReferenceFiles} key="ref-files-checkbox"
                disabled={isReferenceFilesCheckboxDisabled} className="checkbox-container for-state-showReferenceFiles">
                Show Reference Files
            </Checkbox>
        );
    }

    /*** Control for Workflow or WorkflowRun View only ***/

    /**
     * Required props below -
     *
     * @prop {boolean} showParameters - Whether we're showing Workflow parameter arguments.
     * @prop {function} onToggleShowParameters - Callback to toggle visibility of parameters.
     */
    parametersCheckbox(){
        var { showParameters, onToggleShowParameters } = this.props;
        if (typeof showParameters !== 'boolean' || typeof onToggleShowParameters !== 'function'){
            return null;
        }
        return (
            <Checkbox checked={showParameters} onChange={onToggleShowParameters}
                className="checkbox-container for-state-showParameters" key="params-checkbox">
                Show Parameters
            </Checkbox>
        );
    }

    static keyTitleMap = {
        'detail'    : 'Analysis Steps',
        'basic'     : 'Basic Inputs & Outputs',
        'cwl'       : 'CWL Graph'
    };

    /**
     * Meant for Workflow and WorkflowRunView only, not Provenance Graphs.
     * Required props below --
     *
     * @prop {Object} context - JSON of Item containing workflow steps.
     * @prop {string} showChartType - Type of chart shown. 'Detail' and 'basic' supported.
     * @prop {function} onChangeShowChartType - Callback accepting key of new chart type.
     */
    chartTypeDropdown(){
        const { context, showChartType, onChangeShowChartType } = this.props;
        const detail = WorkflowGraphSectionControls.analysisStepsSet(context) ? (
            <DropdownItem eventKey="detail" active={showChartType === 'detail'}>
                Analysis Steps
            </DropdownItem>
        ) : null;

        const basic = (
            <DropdownItem eventKey="basic" active={showChartType === 'basic'}>
                Basic Inputs & Outputs
            </DropdownItem>
        );

        return (
            <DropdownButton id="detail-granularity-selector" key="chart-type"
                className="for-state-showChart" pullRight
                onSelect={onChangeShowChartType}
                title={WorkflowGraphSectionControls.keyTitleMap[showChartType]}>
                { basic }{ detail }
            </DropdownButton>
        );
    }

    /*** Controls for Provenance Graphs ***/

    indirectFilesCheckbox(){
        var { showIndirectFiles, onToggleIndirectFiles, isShowMoreContextCheckboxDisabled } = this.props;
        if (typeof showIndirectFiles !== 'boolean' || typeof onToggleIndirectFiles !== 'function') return null;
        return (
            <Checkbox checked={showIndirectFiles} onChange={onToggleIndirectFiles}
                disabled={isShowMoreContextCheckboxDisabled} className="checkbox-container"
                key="show-indirect-files-checkbox">
                Show More Context
            </Checkbox>
        );
    }

    allRunsCheckbox(){
        var { allRuns, onToggleAllRuns, loading, isAllRunsCheckboxDisabled } = this.props;
        if (typeof allRuns !== 'boolean' || typeof onToggleAllRuns !== 'function') return null;
        return (
            <Checkbox checked={!allRuns && !isAllRunsCheckboxDisabled} onChange={onToggleAllRuns}
                disabled={isAllRunsCheckboxDisabled} className="checkbox-container" key="show-all-runs-checkbox">
                { loading ? <i className="icon icon-spin icon-fw icon-circle-o-notch" style={{ marginRight : 3 }}/> : '' } Collapse Similar Runs
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


class RowSpacingTypeDropdown extends React.Component {

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
        const { currentKey, id, onSelect } = this.props;
        const menuItems = _.map(_.keys(RowSpacingTypeDropdown.titleMap), function(k){
            return (
                <DropdownItem key={k} eventKey={k} active={currentKey === k}>
                    { RowSpacingTypeDropdown.titleMap[k] }
                </DropdownItem>
            );
        });

        return (
            <DropdownButton id={id || "rowspacingtype-select"}
                pullRight onSelect={onSelect} title={RowSpacingTypeDropdown.titleMap[currentKey]}>
                { menuItems }
            </DropdownButton>
        );
    }

}
