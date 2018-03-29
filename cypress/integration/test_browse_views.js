import _ from 'underscore';

describe('Browse Views', function () {

    context.skip('Test /browse/ page redirection from homepage', function(){
        /*
        before(function(){
            cy.visit('/');
        });
        */

        it('If start from home page, clicking on Browse nav menu item gets us to Browse page.', function(){

            cy.visit('/');

            cy.get('#sBrowse').click().then(()=>{
                cy.get('#page-title-container .page-title span.title').should('have.text', 'Data Browser');
            });

        });

        it('Only shows award.project=4DN results & "Include External Data" is off', function(){

            cy.location('search').should('include', 'award.project=4DN');
            cy.get('#stats .browse-base-state-toggle-container input[type="checkbox"]').should('not.be.checked');

        });


        it('If point browser to /browse/ page (no URL params), we also get redirected to award.project=4DN correctly.', function(){

            cy.visit('/');
            cy.visit('/browse/', { "failOnStatusCode" : false });

            cy.location('search').should('include', 'award.project=4DN');

        });

    });

    context('QuickInfoBar & BarPlotChart', function(){

        before(function(){
            cy.clearCookies();
        });

        beforeEach(function(){
            Cypress.Cookies.preserveOnce(); // @see https://docs.cypress.io/api/cypress-api/cookies.html#Preserve-Once
            Cypress.Cookies.defaults({
                whitelist: [ "jwtToken", "searchSessionID" ]
            });
        });

        afterEach(function(){
            Cypress.Cookies.preserveOnce(); // @see https://docs.cypress.io/api/cypress-api/cookies.html#Preserve-Once
        });

        it('Login & test that QuickInfoBar counts changed, that we have BarPlot bars', function(){


            cy.visit('/browse/', { "failOnStatusCode" : false });
            cy.getQuickInfoBarCounts().then((counts)=>{

                const loggedOutCounts = _.clone(counts);

                cy.login4DN().then(()=>{
                    cy.getQuickInfoBarCounts().its('experiment_sets').should('be.greaterThan', loggedOutCounts.experiment_sets);
                });

            });

        });

        it('Ensure we have some BarPlot bars', function(){

            cy.get('.bar-plot-chart .chart-bar').should('have.length.above', 0);
            cy.wait(1000).visit('/browse/', { "failOnStatusCode" : false });

        });

    });


});
