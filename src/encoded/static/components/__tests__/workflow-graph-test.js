'use strict';

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

describe('Testing Workflow Graph', function() {
    var React, ItemView, TestUtils, context, schemas, _, Wrapper, WorkflowRunView, testWorkflowInstance;

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
        testWorkflowInstance = TestUtils.renderIntoDocument(
            <Wrapper>
                <WorkflowRunView schemas={schemas} context={context} />
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

        var showParamsBox = TestUtils.scryRenderedDOMComponentsWithClass(testWorkflowInstance, 'show-params-checkbox-container')[0];
        showParamsBox = showParamsBox.childNodes[0].childNodes[0].childNodes[0]; // Get down to checkbox element.

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

});
