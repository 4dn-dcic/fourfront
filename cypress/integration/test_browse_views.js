import _ from 'underscore';

describe('Browse Views', function () {

    context('Test /browse/ page redirection from homepage', function(){
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

        it('Only shows award.project=4DN results.', function(){

            cy.location('search').should('include', 'award.project=4DN');

        });


        it('If point browser to /browse/ page (no URL params), we also get redirected to award.project=4DN correctly.', function(){

            cy.visit('/');
            cy.visit('/browse/', { "failOnStatusCode" : false });

            cy.location('search').should('include', 'award.project=4DN');

        });

    });

    context('QuickInfoBar', function(){

        it('Test that QuickInfoBar counts change re: logging in', function(){


            cy.visit('/browse/', { "failOnStatusCode" : false });
            cy.getQuickInfoBarCounts().then((counts)=>{

                const loggedOutCounts = _.clone(counts);

                cy.login4DN().then(()=>{
                    cy.getQuickInfoBarCounts().its('experiment_sets').should('be.greaterThan', loggedOutCounts.experiment_sets);
                });

            });


        });

    });


});