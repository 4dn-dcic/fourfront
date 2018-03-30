

describe('Search Views', function () {

    context('For /search/?type=Item', function () {

        before(function(){ // beforeAll
            cy.visit('/search/');
        });

        it('Has at least 100 results for /search/?type=Item', function () {

            cy.location('search').should('include', 'type=Item');


            cy.get('.search-results-container .search-result-row').then(($searchResultElems)=>{
                expect($searchResultElems.length).to.equal(25);
            });

            cy.searchPageTotalResultCount().should('be.greaterThan', 100);

        });

        it('Load as you scroll works for ?type=Item', function () {

            cy.location('search').should('include', 'type=Item');

            cy.searchPageTotalResultCount().then((totalCountExpected)=>{
                const intervalCount = Math.min(20, parseInt(totalCountExpected / 25));

                for (let interval = 0; interval < intervalCount; interval++){
                    cy.scrollToBottom().then(()=>{
                        cy.get('.search-results-container .search-result-row[data-row-number="' + ( 25 * (interval + 1) ) + '"]').should('have.length', 1);
                    });
                }

            });

        });

    });

    context('For Page collection', function(){

        before(function(){ // beforeAll
            cy.visit('/pages'); // We should get redirected to ?type=Page
        });

        it('Should redirect to /search/?type=Page correctly', function(){
            cy.location('search').should('include', 'type=Page');
            cy.location('pathname').should('include', '/search/');
        });

        it('Should have at least 20 results.', function(){
            cy.get('.search-results-container .search-result-row').then(($searchResultElems)=>{
                expect($searchResultElems.length).to.be.greaterThan(20);
            });
        });

    });

});