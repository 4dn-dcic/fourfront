describe("Individual Item Pages", function(){

    context('FileProcessed', function(){

        it('Have at least 50 MCOOL FileProcessed files', function(){
            cy.visit('/search/?type=FileProcessed&file_format=mcool').end()
                .wait(300).get('#slow-load-container').should('not.have.class', 'visible').end()
                .searchPageTotalResultCount().should('be.greaterThan', 49);
        });


        it('Default sort ordering is by date_created', function(){
            cy.get('.search-headers-row .search-headers-column-block[data-field="date_created"] .column-sort-icon').should('have.class', 'active');
        });


        it('Most recent MCOOL file has non-disabed Graph tab, with some nodes.', function(){
            cy.get('.search-results-container .search-result-row .search-result-column-block[data-field="display_title"] a').first().should('contain', '.mcool').click({ force: true }).end()
                .get('.tab-view-container .rc-tabs-nav').within(($tabNav)=>{
                    cy.contains('Graph').should('have.length', 1).then(($tabInnerElem)=>{
                        const $tab = $tabInnerElem.closest('.rc-tabs-tab');
                        return cy.wrap($tab).should('not.have.class', 'rc-tabs-tab-disabled').end()
                            .wrap($tabInnerElem).click().wait(200).end();
                    });
                }).end()
                .get('.graph-wrapper .nodes-layer .node').should('have.length.greaterThan', 0);
        });


        it('Most recent MCOOL file has non-disabed HiGlass tab. TODO: TEST HIGLASS', function(){
            cy.get('.tab-view-container .rc-tabs-nav').within(($tabNav)=>{
                cy.contains('HiGlass Browser').should('have.length', 1).then(($tabInnerElem)=>{
                    const $tab = $tabInnerElem.closest('.rc-tabs-tab');
                    return cy.wrap($tab).should('not.have.class', 'rc-tabs-tab-disabled');
                });
            });
        });


    });

});