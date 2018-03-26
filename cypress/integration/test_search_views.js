

describe('Search Views', function () {

    context('Navigation', function () {
/*
        beforeEach(function () {
            cy.visit('https://example.cypress.io')
            cy.get('.navbar-nav').contains('Commands').click()
            cy.get('.dropdown-menu').contains('Navigation').click()
        });
*/  

        before(function(){ // beforeAll
            cy.visit('/search/');
        });

        it('Has at least 100 results for /search/?type=Item', function () {

            cy.location('search').should('include', 'type=Item');


            let searchResultRows = cy.get('.search-results-container .search-result-row').then(($searchResultElems)=>{
                expect($searchResultElems.length).to.equal(25);
            });

            cy.searchPageTotalResultCount().should('be.greaterThan', 100);

        });

        it('Load as you scroll works for ?type=Item', function () {

            cy.location('search').should('include', 'type=Item');

            cy.searchPageTotalResultCount().then((totalCountExpected)=>{
                let intervalCount = Math.min(20, parseInt(totalCountExpected / 25));

                for (let interval = 0; interval < intervalCount; interval++){
                    cy.scrollToBottom().then(()=>{
                        cy.get('.search-results-container .search-result-row[data-row-number="' + ( 25 * (interval + 1) ) + '"]', { timeout: 5000 }).should('have.length', 1);
                    });
                }

            });

        });

    });

});