/**
 * Test some traced WorkflowRun graphs -- hardcoded.
 * 
 * ToDos:
 * - Test WorkflowGraphingSection controls, ensure graph transitions / states change correctly and timely. -- For Workflow/Run, and Traced Runs.
 * - Column positions align with prev node positions.
 * - SelectedNode -> graph visually adjusts correctly (edge classes/colors, node classes/colors) & shows appropriate detailPane.
 */

import { testGraphTabClick, testNodesTextGlobalInputs } from './../support/macros';

function getRowIndexFromNode(node){
    return (parseInt(node.style.top) - 60) / 75;
}

describe("WorkflowRun traced graphs for selected ExperimentSets", function(){

    context("ExperimentSetReplicate - 4DNES18BMU79", function(){

        const global_input_file_accessions = ['4DNFIUPP7VYD', '4DNFIY7WIH8Y', '4DNFI9QM9KK5', '4DNFIXIJYKZ1', '4DNFI1CIZT87', '4DNFIXKHKJ1E'];

        before(function(){
            cy.visit('/experiment-set-replicates/4DNES18BMU79/').wait(100).end();
        });

        testGraphTabClick();

        testNodesTextGlobalInputs(global_input_file_accessions);

        it.skip('1st column of steps is aligned to input nodes', function(){ // Wait for node.nodeData.node to exist on each DOM node before proceeding w/ further tests.
            cy.get('.graph-wrapper .nodes-layer .node[data-node-type="step"][data-node-column="1"]').should('have.length', 3).then(function($stepNodes){
                Cypress._.forEach($stepNodes, function(stepNode){

                });
            });
        });

    });

});