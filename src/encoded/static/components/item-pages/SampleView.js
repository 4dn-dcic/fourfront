'use strict';

import React from 'react';
import moment from 'moment';
import _ from 'underscore';
import memoize from 'memoize-one';
import { console, object, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { ItemFileAttachment } from './components/ItemFileAttachment';
import DefaultItemViewWithProvenance, { ProvenanceGraphTabView } from './DefaultItemViewWithProvenance';



export default class SampleView extends DefaultItemViewWithProvenance {

    shouldGraphExist(){
        const { context } = this.props;
        return (
            (Array.isArray(context.workflow_run_outputs) && context.workflow_run_outputs.length > 0)
            // We can uncomment below line once do permissions checking on backend for graphing
            //&& _.any(context.workflow_run_outputs, object.itemUtil.atId)
        );
    }

    getTabViewContents(){
        const initTabs = [
            // todo - FileViewOverview.getTabObject(this.props),
            ...this.getCommonTabs()
        ];

        if (this.shouldGraphExist()){
            initTabs.push(ProvenanceGraphTabView.getTabObject({
                ...this.props,
                ...this.state,
                isNodeCurrentContext,
                toggleAllRuns: this.toggleAllRuns
            }));
        }

        return initTabs;
    }

}


export function isNodeCurrentContext(node, context){
    if (node.nodeType !== 'input' && node.nodeType !== 'output') return false;
    return (
        context && typeof context.accession === 'string' && node.meta.run_data && node.meta.run_data.file
        && typeof node.meta.run_data.file !== 'string' && !Array.isArray(node.meta.run_data.file)
        && typeof node.meta.run_data.file.accession === 'string'
        && node.meta.run_data.file.accession === context.accession
    ) || false;
}



