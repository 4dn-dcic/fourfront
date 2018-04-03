
// Run static CI (Travis) tests first.
const staticSearchTestsDeploy = require('./../../../../cypress/integration/02_search_views');


describe('Post-Deployment Search View Tests', function () {


    context('q=olfactory results are consistently ordered', function(){

        before(function(){
            cy.visit('/search/');
        });

        it('Starting from /search/, typing "olfactory" into searchbox redirects back to search', function(){

            cy.searchPageTotalResultCount().should('be.greaterThan', 100).then((origResultCount)=>{
                return cy.get('input[name="q"]').focus().clear().type('olfactory').wait(10).end()
                    .get('form.navbar-search-form-container').submit().end()
                    .location('search').should('include', 'q=olfactory').end()
                    .wait(300).get('#slow-load-container').should('not.have.class', 'visible').end()
                    .searchPageTotalResultCount().should('be.lessThan', origResultCount).end();
            });

        });

        it('Can scroll all the way down without interruption', function(){

            cy.searchPageTotalResultCount().should('be.greaterThan', 50).should('be.lessThan', 30000).then((resultCount)=>{
                const intervalCount = parseInt(resultCount / 25);

                for (let interval = 0; interval < intervalCount; interval++){
                    cy.scrollToBottom().end().get('.search-results-container .search-result-row[data-row-number="' + ( 25 * (interval + 1) ) + '"]').should('have.length', 1);
                }
            });

        });


    });

});
