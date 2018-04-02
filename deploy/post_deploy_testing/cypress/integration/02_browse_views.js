import _ from 'underscore';
import { compareQuickInfoCountsVsBarPlotCounts } from './../support/macros';


describe('Browse Views', function () {

    context('Test /browse/ page redirection from homepage', function(){

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

        before(()=>{
            cy.visit('/browse/', { "failOnStatusCode" : false }) // Wait for redirects
                .wait(300).get('#slow-load-container').should('not.have.class', 'visible').end();
        });

        it('On award.project=4DN view; BarPlot counts == QuickInfoBar counts', function(){

            cy.get('.bar-plot-chart .chart-bar').should('have.length.above', 0)
                .end().window().scrollTo(0, 200)
                .wait(300).get('#slow-load-container').should('not.have.class', 'visible').end().wait(1000)
                .then(()=>{
                    compareQuickInfoCountsVsBarPlotCounts();
                });

        });

        it('Toggling "Show External Data" ==> higher, matching counts', function(){

            cy.getQuickInfoBarCounts().then((initialCounts)=>{

                cy.get('.browse-base-state-toggle-container label.onoffswitch-label').click().then(()=>{
                    cy.wait(1000) // Wait for 'slow-load-container' to become visible if needed, and wait for it to load
                        .get('#slow-load-container').should('not.have.class', 'visible').end()
                        .wait(250) // Wait for JS to init re-load of barplot data, then for it to have loaded.
                        .get('#select-barplot-field-1').should('not.have.attr', 'disabled').end()
                        .get('#stats-stat-expsets.stat-value:not(.loading)').should('have.length.greaterThan', 0).end()
                        .getQuickInfoBarCounts().its('experiment_sets').should('be.greaterThan', initialCounts.experiment_sets).wait(1000).then(()=>{
                            compareQuickInfoCountsVsBarPlotCounts();
                        });
                });

            });

        });


        it.skip('Total counts stay same upon changing groupBy & xAxis fields', function(){

            cy.getQuickInfoBarCounts().then((initialCounts)=>{

                // TODO;

            });

        });

        it('Login & ensure QuickInfoBar counts have changed; BarPlot counts match', function(){

            cy.getQuickInfoBarCounts().then((counts)=>{

                const loggedOutCounts = _.clone(counts);

                cy.login4DN().wait(200)
                    .get('#stats-stat-expsets').should('have.text', '').end()
                    .getQuickInfoBarCounts().its('experiment_sets').should('be.greaterThan', loggedOutCounts.experiment_sets).end().then(()=>{
                        return compareQuickInfoCountsVsBarPlotCounts();
                    })
                    .logout4DN();

            });

        });

    });


});
