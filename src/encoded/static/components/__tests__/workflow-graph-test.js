'use strict';

import React from 'react';
import _ from 'underscore';
import TestUtils from 'react-dom/test-utils';
import WorkflowRunView from './../item-pages/WorkflowRunView';

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

jest.mock('./../util/navigate');

describe('Testing Workflow Graph', function() {
    var context, schemas, testWorkflowInstance, sinon, server;

    function getShowParamsCheckBox(){
        var showParamsBox = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'checkbox-container for-state-showParameters')[0];
        showParamsBox = showParamsBox.childNodes[0].childNodes[0]; // Get down to checkbox element.
        return showParamsBox;
    }

    beforeAll(function(){
        sinon = require('sinon');
        server = sinon.fakeServer.create(); // We just need this to patch AJAX requests atm.
    });

    afterAll(function(){
        server.restore();
    });

    beforeEach(function() {

        // Get test Data
        context = require('./../testdata/workflow_run/awsem-partc').default;
        schemas = require('../testdata/schemas');

        var viewProps = {
            schemas, context,
            'onNodeClick' : null,
            'windowWidth' : 1200,
            'href' : "https://data.4dnucleome.org/workflow-runs-sbg/0fe19e8e-c565-4c0c-8058-effe5d81f53b/"
        };

        testWorkflowInstance = TestUtils.renderIntoDocument(<WorkflowRunView {...viewProps} />);
        jest.useRealTimers();
        //jest.runAllTimers();
    });

    it('Given no extra configuration, it has the correct number of nodes & edges, and proper step names', function() {

        var nodes = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'node');
        expect(nodes.length).toBe(8);

        var edges = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'edge-path');
        expect(edges.length).toBe(7);

        var stepKeys = _.map(
            _.filter(nodes, function(nodeElement){
                return nodeElement.getAttribute('data-node-type') === 'step';
            }),
            function(nodeElement){
                return nodeElement.getAttribute('data-node-key');
            }
        )

        _.forEach([ 'add_hic_normvector_to_mcool', 'cool2mcool', 'extract_mcool_normvector_for_juicebox' ], function(keyExpected){
            expect(stepKeys.indexOf(keyExpected) !== -1).toBe(true);
        })

    });



    it('Clicking on "Show Parameters" adds some extra parameter nodes', function() {

        var showParamsBox = getShowParamsCheckBox();

        // Should be unchecked, initially.
        expect(showParamsBox.checked).toBe(false);

        // Double check 8 original nodes.
        var nodes = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'node');
        expect(nodes.length).toBe(8);

        // Toggle the checkbox input
        TestUtils.Simulate.change(showParamsBox);

        // Should now have 1 more node & edge (param)
        nodes = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'node');
        expect(nodes.length).toBe(9);

        var edges = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'edge-path');
        expect(edges.length).toBe(8);

        // Toggle the checkbox input again, to go back to 8 nodes.
        TestUtils.Simulate.change(showParamsBox);

        setTimeout(()=>{

            // Should be unchecked again.
            expect(showParamsBox.checked).toBe(false);

            nodes = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'node');
            edges = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'edge-path');
            expect(nodes.length).toBe(8);
            expect(edges.length).toBe(7);
            done();

        }, 1000);

        


    });

    it('Clicking on a node shows applicable DetailPanes w/ applicable content', function() {

        var showParamsBox = getShowParamsCheckBox();

        // Should be unchecked, initially.
        expect(showParamsBox.checked).toBe(false);

        // Double check 8 original nodes.
        var nodes = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'node');
        expect(nodes.length).toBe(8);

        // Toggle the checkbox input
        TestUtils.Simulate.change(showParamsBox);
        //jest.runOnlyPendingTimers();

        // Should now have 1 more node & edge (param)
        nodes = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'node');
        expect(nodes.length).toBe(9);


        // --------------------

        // Find a ... Step Node.

        var stepNodes = _.filter(nodes, function(n){
            return n.getAttribute('data-node-type') === 'step';
        });

        // We should have 3 of these.
        expect(stepNodes.length).toEqual(3);

        // None of them should be selected by default.
        expect(_.every(stepNodes, function(n){ return n.getAttribute('data-node-selected') === 'false'; })).toBe(true);

        var stepNodeToClickName = 'add_hic_normvector_to_mcool'; // Lets click on the node w/ this name.
        var stepNodeToClick = _.find(stepNodes, function(n){ return n.getAttribute('data-node-key') === stepNodeToClickName; });

        expect(stepNodeToClickName).toEqual(stepNodeToClick.getAttribute('data-node-key')); // Double check
        console.log("Will test clicking on step node in test-data WorkflowRun graph:", stepNodeToClick.getAttribute('data-node-key')); // Should === stepNodeToClickName


        // CLICK IT CLICK IT NOW
        TestUtils.Simulate.click(stepNodeToClick.childNodes[0]); // click handler bound to inner div element.
        //jest.runOnlyPendingTimers();

        // Ensure our node is now selected.
        expect(stepNodeToClick.getAttribute('data-node-selected')).toEqual('true');

        // Ensure that only the one node total is selected.
        expect(_.filter(nodes, function(n){
            return n.getAttribute('data-node-selected') === 'true';
        }).length).toEqual(1);


        // Make sure we have a DetailPane
        var detailPaneBody = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'detail-pane-body')[0];


        // Make sure our step name, and proper label for it, is somewhere within content of detail pane.
        expect(detailPaneBody.textContent.indexOf('Step Name')).toBeGreaterThan(-1);
        expect(detailPaneBody.textContent.indexOf(stepNodeToClickName)).toBeGreaterThan(-1);

        // -----

        // Lets find some other cool node to click. How about an output mcool.
        var outMcoolNodeToClick = _.find(nodes, function(n){
            return n.getAttribute('data-node-key') === 'output_mcool.0';
        });

        // Ensure our node is -not- selected.
        expect(outMcoolNodeToClick.getAttribute('data-node-selected')).toEqual('false');

        // CLICK IT CLICK IT NOW!
        TestUtils.Simulate.click(outMcoolNodeToClick.childNodes[0]); // click handler bound to inner div element.
        //jest.runOnlyPendingTimers();

        // Ensure our node -IS- selected.
        expect(outMcoolNodeToClick.getAttribute('data-node-selected')).toEqual('true');

        // Ensure old step node now NOT ALSO selected.
        expect(stepNodeToClick.getAttribute('data-node-selected')).toEqual('false');

        // Make sure our file accession, and proper label for it, is somewhere within content of detail pane.
        expect(detailPaneBody.textContent.indexOf('Generated File')).toBeGreaterThan(-1);
        expect(detailPaneBody.textContent.indexOf('4DNFIMCOOL02')).toBeGreaterThan(-1);

        // Find another output node and make sure it is in the proper-est column.
        // For this testdata, the steps are in improper order. "add_hic_normvector" is the last step in Workflow.steps, yet is actually 2nd step in order of events.
        // Graphing should account for this and ensure that output of add_hic_normvector is used as input of "extract_mcool...". Easiest way to test is to check column of our last file to make sure it had been moved to proper column.

        var outNormVectorNode = _.find(nodes, function(n){
            return n.getAttribute('data-node-key') === 'output_normvector.0';
        });

        expect(parseInt(outNormVectorNode.getAttribute('data-node-column'))).toEqual(6);

    });

});

describe('Find nodes from other columns', function() {
    var context, schemas, testWorkflowInstance, sinon, server;

    function getShowReferenceFilesCheckBox(testInstance = testWorkflowInstance){
        // Returns the checkbox element responsible for toggling the Reference Files on the graph.
        var showReferenceFilesBox = TestUtils.scryRenderedDOMComponentsWithClass(testInstance, 'checkbox-container for-state-showReferenceFiles')[0];
        showReferenceFilesBox = showReferenceFilesBox.childNodes[0].childNodes[0]; // Get down to checkbox element.
        return showReferenceFilesBox;
    }

    beforeAll(function(){
        sinon = require('sinon');
        server = sinon.fakeServer.create(); // We just need this to patch AJAX requests atm.
    });

    afterAll(function(){
        server.restore();
    });

    beforeEach(function() {

        // Make a workflow run with at least 5 graph columns (including arrows.) The node in column 4 refers to a chromsize file whose node is already in column 0.
        context = require('./../testdata/workflow_run/awsem-node-dupe-check').default;
        schemas = require('../testdata/schemas');

        var viewProps = {
            schemas, context,
            'onNodeClick' : null,
            'windowWidth' : 1200,
            'href' : "https://data.4dnucleome.org/workflow-runs-sbg/0fe19e8e-c565-4c0c-8058-effe5d81f53b/"
        };

        testWorkflowInstance = TestUtils.renderIntoDocument(<WorkflowRunView {...viewProps} />);
        jest.useFakeTimers();
        jest.runAllTimers();
    });

    it('Should match Nodes with previous columns', function() {
        // Graph generation must look for all of the previous columns for existing nodes, not just the direct ancestors.

        // Now visit the graph.
        var showReferenceFilesCheckBox = getShowReferenceFilesCheckBox();

        // Should be unchecked, initially.
        expect(showReferenceFilesCheckBox.checked).toBe(false);

        // Toggle the checkbox input
        TestUtils.Simulate.change(showReferenceFilesCheckBox);
        jest.runOnlyPendingTimers();

        // You should only see 2 nodes in column 0: The input file and the chromsize file.
        let nodes = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'node');

        let column0Nodes = _.filter(nodes, function(n){
            return n.getAttribute('data-node-column') === '0';
        });

        expect(column0Nodes.length).toEqual(2);

        // There should be 11 edges in total.
        var edges = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'edge-path');
        expect(edges.length).toEqual(11);
    });
});
