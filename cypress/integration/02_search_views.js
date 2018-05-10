

describe('Deployment/CI Search View Tests', function () {

    context('/search/?type=Item', function () {

        before(function(){ // beforeAll
            cy.visit('/search/');
        });

        it('Has at least 100 results for /search/?type=Item', function () {
            cy.location('search').should('include', 'type=Item').end()
                .get('.search-results-container .search-result-row').then(($searchResultElems)=>{
                    expect($searchResultElems.length).to.equal(25);
                }).end()
                .searchPageTotalResultCount().should('be.greaterThan', 100);
        });

    });

    context('/search/?type=Page', function(){

        before(function(){ // beforeAll
            cy.visit('/pages'); // We should get redirected to ?type=Page
        });

        beforeEach(function(){
            // Ensure we preserve search session cookie for proper ordering.
            Cypress.Cookies.preserveOnce("searchSessionID");
        });

        it('Should redirect to /search/?type=Page correctly', function(){
            cy.location('search').should('include', 'type=Page').end()
                .location('pathname').should('include', '/search/');
        });

        it('Should have at least 20 results.', function(){
            cy.get('.search-results-container .search-result-row').then(($searchResultElems)=>{
                expect($searchResultElems.length).to.be.greaterThan(20);
            });
        });

    });


    context('Search Box in Navigation', function(){

        before(function(){ // beforeAll
            cy.visit('/'); // Start at home page
        });

        beforeEach(function(){
            // Ensure we preserve search session cookie for proper ordering.
            Cypress.Cookies.preserveOnce("searchSessionID");
        });

        it('SearchBox input works, goes to /browse/ on submit', function(){
            cy.get('input[name="q"]').focus().type('mouse').wait(10).end()
                .get('form.navbar-search-form-container').submit().end()
                .wait(300).get('#slow-load-container').should('not.have.class', 'visible').end()
                .get('#page-title-container span.title').should('have.text', 'Data Browser').end() // Make sure we got redirected to /browse/. We may or may not have results here depending on if on local and logged out or not.
                .location('search')
                .should('include', 'award.project=4DN')
                .should('include', 'q=mouse');
        });

        it('"All Items" option works, takes us to search page', function(){
            cy.get('form.navbar-search-form-container button#search-item-type-selector').click().wait(100).end()
                .get('form.navbar-search-form-container ul.dropdown-menu li:not(.active) a').click().end()
                .get('#page-title-container span.title').should('have.text', 'Search').end()
                .location('search').should('not.include', 'award.project=4DN')
                .should('include', 'q=mouse').end()
                .searchPageTotalResultCount().should('be.greaterThan', 0);
        });

        it('Clear search button works ==> more results', function(){
            cy.searchPageTotalResultCount().then((origTotalResults)=>{
                cy.get('form.navbar-search-form-container .reset-button').click().end()
                    .wait(1200).get('#slow-load-container').should('not.have.class', 'visible').end()
                    .searchPageTotalResultCount().should('be.greaterThan', origTotalResults);
            });
        });

        it('date_created:[* TO 2018-01-01] returns 3 =< x < all results.', function(){
            cy.screenshot('Before text search "date_created:[* TO 2018-01-01]"').end().searchPageTotalResultCount().then((origTotalResults)=>{
                cy.get('input[name="q"]').focus().clear().type('date_created:[* TO 2018-01-01]').wait(10).end()
                    .get('form.navbar-search-form-container button#search-item-type-selector').click().wait(100).end()
                    .get('form.navbar-search-form-container ul.dropdown-menu li:last-child a').click().end() // Select 'All Items'
                    //.get('form.navbar-search-form-container').submit().end()
                    .location('search').should('include', '2018-01-01').wait(300).end()
                    .get('#slow-load-container').should('not.have.class', 'visible').end()
                    .searchPageTotalResultCount().should('be.greaterThan', 2).should('be.lessThan', origTotalResults).end().screenshot('After text search "date_created:[* TO 2018-01-01]"').end();
            });
        });


    });

});
