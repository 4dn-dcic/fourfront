'use strict';

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

describe('Testing Workflow Graph', function() {
    var React, ItemView, TestUtils, context, schemas, _, Wrapper, WorkflowRunView, testWorkflowInstance;

    function getShowParamsCheckBox(){
        var showParamsBox = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'show-params-checkbox-container')[0];
        showParamsBox = showParamsBox.childNodes[0].childNodes[0].childNodes[0]; // Get down to checkbox element.
        return showParamsBox;
    }

    beforeEach(function() {

        // 3rd Party Deps
        React = require('react');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');

        // Our own deps
        WorkflowRunView = require('./../item-pages/WorkflowRunView').WorkflowRunView;

        // Get test Data
        context = require('./../testdata/workflow_run/awsem-partc').default;
        schemas = require('../testdata/schemas');

        // Setup
        Wrapper = React.createClass({
            render: function() {
                return (
                    <div>{this.props.children}</div>
                );
            }
        });
        // If we do not unset checkHrefForSelectedNode, checkWindowLocationHref, and onNodeClick -- graph will try to append '#nodeID' to document.location and use href to inform selected node state. Document location and href are not supported by test suite/lib so we must disable this.
        testWorkflowInstance = TestUtils.renderIntoDocument(
            <Wrapper>
                <WorkflowRunView schemas={schemas} context={context} checkHrefForSelectedNode={false} checkWindowLocationHref={false} onNodeClick={null} />
            </Wrapper>
        );

        jest.runAllTimers();

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
        jest.runAllTimers();

        // Should now have 1 more node & edge (param)
        nodes = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'node');
        expect(nodes.length).toBe(9);

        var edges = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'edge-path');
        expect(edges.length).toBe(8);

        // Toggle the checkbox input again, to go back to 8 nodes.
        TestUtils.Simulate.change(showParamsBox);
        jest.runAllTimers();

        nodes = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'node');
        edges = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'edge-path');
        expect(nodes.length).toBe(8);
        expect(edges.length).toBe(7);


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
        jest.runAllTimers();

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
        jest.runAllTimers();

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

    });

});
