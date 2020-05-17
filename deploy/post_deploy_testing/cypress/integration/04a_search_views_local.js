

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

    context('Publications, Files Collections', function(){
        // These are similarly implemently to the BrowseView, we should have specific tests for these

        it('/publications/ should redirect to /search/?type=Publication', function(){
            cy.visit('/publications/').location('search').should('include', 'type=Publication').end()
                .location('pathname').should('include', '/search/');
        });

        it('Should have at least 3 Publications.', function(){
            cy.get('.search-results-container .search-result-row').then(($searchResultElems)=>{
                expect($searchResultElems.length).to.be.greaterThan(2);
            });
            cy.get('.search-results-container .search-result-row .toggle-detail-button-container').then(($searchResultToggleBtnElems)=>{
                expect($searchResultToggleBtnElems.length).to.be.greaterThan(2);
            });
        });

        it('/files/ should redirect to /search/?type=File', function(){
            cy.visit('/files/').location('search').should('include', 'type=File').end()
                .location('pathname').should('include', '/search/');
        });

        it('Should have at least 20 File row selection checkboxes', function(){
            cy.get('.search-results-container .search-result-row').then(($searchResultElems)=>{
                expect($searchResultElems.length).to.be.greaterThan(20);
            });
            cy.get('.search-results-container .search-result-row .checkbox-with-label.expset-checkbox input').then(($checkboxes)=>{
                expect($checkboxes.length).to.be.greaterThan(20);
            });
        });

        it('Should have columns for file type, format', function(){
            cy.get('.headers-columns-overflow-container .columns .search-headers-column-block[data-field="file_type"]').contains("File Type");
            cy.get('.headers-columns-overflow-container .columns .search-headers-column-block[data-field="file_format.file_format"]').contains("File Format");
        });

        // TODO test facets

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
                .get('#page-title-container .page-title').should('contain', 'Data Browser').end() // Make sure we got redirected to /browse/. We may or may not have results here depending on if on local and logged out or not.
                .location('search')
                .should('include', 'ExperimentSetReplicate')
                .should('include', 'q=mouse');
        });

        it('"All Items" option works, takes us to search page', function(){
            cy.get('form.navbar-search-form-container button#search-item-type-selector').click().wait(100).end()
                .get('form.navbar-search-form-container div.dropdown-menu a[data-key="all"]').click().end()
                .get('form.navbar-search-form-container').submit().end()
                .get('#page-title-container .page-title').should('contain', 'Search').end()
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

        it('Wildcard query string returns all results.', function(){
            cy.window().screenshot('Before text search "*"').end().searchPageTotalResultCount().then((origTotalResults)=>{
                cy.get('input[name="q"]').focus().clear().type('*').wait(10).end()
                    .get('form.navbar-search-form-container').submit().end()
                    .get('form.navbar-search-form-container button#search-item-type-selector').click().wait(100).end()
                    .get('form.navbar-search-form-container div.dropdown-menu a[data-key="all"]').click().end()
                    .get('form.navbar-search-form-container').submit().end()
                    // handle url encoding
                    .location('search').should('include', '%2A').wait(300).end()
                    .get('#slow-load-container').should('not.have.class', 'visible').end()
                    .searchPageTotalResultCount().should('be.greaterThan', 1).should('equal', origTotalResults).end().window().screenshot('After text search "*"').end();
            });
        });


    });

});
