'use strict';

import React from 'react';
import memoize from 'memoize-one';
import _ from 'underscore';
import { AboveTableControls } from './AboveTableControls';


export const AboveSearchViewTableControls = React.memo(function AboveSearchViewTableControls(props){
    const { context, currentAction, showTotalResults } = props;

    // Case if on SearchView
    let total = null;
    if (showTotalResults) {
        total = (
            <div style={{ 'verticalAlign' : 'bottom' }} className="inline-block">
                <span className="text-500">
                    {
                        typeof showTotalResults === 'number' ? showTotalResults
                            : context && typeof context.total === 'number' ? context.total
                                : null
                    }
                </span> Results
            </div>
        );
    }


    // FOR NOW, we'll stick 'add' button here. -- IF NO SELECTED FILES CONTROLS
    let addButton = null;
    // don't show during submission search "selecting existing"
    if (context && Array.isArray(context.actions) && !currentAction){
        const addAction = _.findWhere(context.actions, { 'name' : 'add' });
        if (addAction && typeof addAction.href === 'string'){
            addButton = (
                <a className={"btn btn-primary btn-xs" + (total ? " ml-05" : "")} href={addAction.href} data-skiprequest="true">
                    <i className="icon icon-fw icon-plus shift-down-1"/>
                    <span>Create</span>
                    &nbsp;
                </a>
            );
        }
    }

    const wrappedLeftSectionControls = (total || addButton) && (
        <div key="total-count" className="pull-left pt-11 box results-count">
            { total }{ addButton }
        </div>
    );

    if (!total && !addButton) return null;

    const aboveTableControlsProps = _.extend(
        _.pick(props, 'isFullscreen', 'windowWidth', 'toggleFullScreen', 'parentForceUpdate'),
        { "panelMap" : AboveTableControls.getCustomColumnSelectorPanelMapDefinition(props) }
    );

    return <AboveTableControls {...aboveTableControlsProps}>{ wrappedLeftSectionControls }</AboveTableControls>;
});
