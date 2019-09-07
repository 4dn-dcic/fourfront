'use strict';

import React from 'react';
import { DropdownButton, DropdownItem } from 'react-bootstrap';
import { Checkbox } from '@hms-dbmi-bgm/shared-portal-components/src/components/forms/components/Checkbox';
import { CollapsibleItemViewButtonToolbar } from './../CollapsibleItemViewButtonToolbar';

export const WorkflowGraphSectionControls = React.memo(function WorkflowGraphSectionControls(props){
    const {
        parsingOptions: { showReferenceFiles },
        onParsingOptChange, windowWidth,
        rowSpacingType, onRowSpacingTypeSelect,
        includeAllRunsInSteps, toggleAllRuns, isLoadingGraphSteps
    } = props;
    return (
        <CollapsibleItemViewButtonToolbar windowWidth={windowWidth}>
            <ShowAllRunsCheckbox checked={includeAllRunsInSteps} onChange={toggleAllRuns} disabled={isLoadingGraphSteps} />
            <ReferenceFilesCheckbox checked={showReferenceFiles} onChange={onParsingOptChange} />
            <RowSpacingTypeSelect rowSpacingType={rowSpacingType} onSelect={onRowSpacingTypeSelect} />
        </CollapsibleItemViewButtonToolbar>
    );
});

function RowSpacingTypeSelect(props){
    const { rowSpacingType, onSelect } = props;
    const titleMap = {
        "compact" : "Centered",
        "stacked" : "Stacked",
        "wide" : "Spread"
    };
    return (
        <DropdownButton onSelect={onSelect} title={titleMap[rowSpacingType]} variant="outline-dark" alignRight>
            <DropdownItem active={rowSpacingType === "compact"} eventKey="compact">Centered</DropdownItem>
            <DropdownItem active={rowSpacingType === "stacked"} eventKey="stacked">Stacked</DropdownItem>
            <DropdownItem active={rowSpacingType === "wide"} eventKey="wide">Spread</DropdownItem>
        </DropdownButton>
    );
}

function ReferenceFilesCheckbox({ checked, onChange, disabled }){
    if (typeof onChange !== 'function') return null;
    if (typeof checked === 'undefined') return null;
    return (
        <Checkbox checked={checked} onChange={onChange} disabled={disabled || checked === null}
            className="checkbox-container for-state-showReferenceFiles" name="showReferenceFiles">
            Show Reference Files
        </Checkbox>
    );
}

function ShowAllRunsCheckbox({ checked, onChange, disabled }){
    if (typeof onChange !== 'function') return null;
    if (typeof checked === 'undefined') return null;
    return (
        <Checkbox checked={checked} onChange={onChange} disabled={disabled || checked === null}
            className="checkbox-container for-state-allRuns">
            Show All Runs
        </Checkbox>
    );
}
