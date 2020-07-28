
import { testGraphTabClick } from '../support/macros';

const countRecentItemsToVisit = 5;

describe("Individual Item Views", function(){

    context.only('FileProcessed MCOOL Collection', function(){

        it('Have at least 35 MCOOL FileProcessed files', function(){
            cy.visit('/search/?type=FileProcessed&file_format.display_title=mcool&workflow_run_outputs.workflow.title!=No+value').end()
                .wait(300).get('#slow-load-container').should('not.have.class', 'visible').end()
                .searchPageTotalResultCount().should('be.greaterThan', 34);
        });

        it('Default sort ordering is by date_created', function(){
            // First we must add the column to the view
            // Open column selector panel
            cy.get('#content div.above-results-table-row div.right-buttons button.btn[data-tip="Configure visible columns"]').click().end()
                // Check the 'Date Created' checkbox
                .get('#content .search-result-config-panel div input[type="checkbox"][value="date_created"]').click().end()
                // Perform check
                .get('.search-headers-row .search-headers-column-block[data-field="date_created"] .column-sort-icon')
                .should('have.class', 'active')
                .within(()=>{
                    cy.get('i').should('have.class', 'icon-sort-down');
                });
        });

    });

    Cypress._.forEach(Cypress._.range(0, countRecentItemsToVisit), function(idx){

        context('FileProcessed MCOOL - #' + (idx + 1) + '/' + countRecentItemsToVisit, function(){

            after(function(){ // Return to search results
                cy.go('back').wait(100).end();
            });

            // TODO gather list of files from Processed files table and test their presence in graph

            it('FileView loads correctly on click from SearchView', function(){
                cy.get('.search-results-container .search-result-row[data-row-number="' + idx + '"] .search-result-column-block[data-field="display_title"] a')
                    .should('contain', '.mcool').click({ force: true }).wait(200).end();
            });

            testGraphTabClick();

            it('Have 3+ graph nodes & 2+ edges including self', function(){
                cy.get('.graph-wrapper .nodes-layer .node').should('have.length.greaterThan', 2).then(function($nodes){
                    return cy.location('pathname').then((pathName)=>{
                        pathName = Cypress._.filter(pathName.split('/'));
                        const fileAccession = pathName[pathName.length - 1];
                        expect(fileAccession).to.have.length(12);
                        expect(fileAccession.slice(0,5)).to.equal('4DNFI');
                        expect(Cypress._.find($nodes, function(nodeElem){
                            return Cypress.$(nodeElem).attr('data-node-key').indexOf(fileAccession) > -1;
                        })).not.to.equal(undefined);
                    });
                }).end().get('.graph-wrapper .edges-layer .edge-path').should('have.length.greaterThan', 1);
            });


            it.skip('Has working HiGlass tab. TODO: TEST HIGLASS', function(){
                cy.get('.tab-view-container .rc-tabs-nav').within(($tabNav)=>{
                    cy.contains('HiGlass Browser').should('have.length', 1).then(($tabInnerElem)=>{
                        const $tab = $tabInnerElem.closest('.rc-tabs-tab');
                        return cy.wrap($tab).should('not.have.class', 'rc-tabs-tab-disabled');
                    });
                });
            });

        });

    });

});
