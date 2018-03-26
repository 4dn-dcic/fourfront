

describe('Search Views', function () {

    context('For /search/?type=Item', function () {
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


            cy.get('.search-results-container .search-result-row').then(($searchResultElems)=>{
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

    context('Test /browse/ page redirection from homepage', function(){
        /*
        before(function(){
            cy.visit('/');
        });
        */

        it('If start from home page, clicking on Browse nav menu item gets us to Browse page.', function(){
            
            cy.visit('/');
            
            cy.get('#sBrowse').click();

            cy.get('#page-title-container .page-title span.title').then(($title)=>{
                expect($title.text()).to.equal('Data Browser');
            });

        });

        it('Only shows award.project=4DN results.', function(){

            cy.location('search').should('include', 'award.project=4DN');

        });


        it('If point browser to /browse/ page (no URL params), we also get redirected to award.project=4DN correctly.', function(){

            cy.visit('/');
            cy.visit('/browse/');

            cy.location('search').should('include', 'award.project=4DN');

        });

    });

});