import _ from 'underscore';
import { compareQuickInfoCountsVsBarPlotCounts } from './../support/macros';


describe('Browse Views - Redirection & Visualization', function () {

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

    context('BarPlotChart & QuickInfoBar', function(){

        before(()=>{
            cy.visit('/browse/', { "failOnStatusCode" : false }) // Wait for redirects
                .wait(300).get('#slow-load-container').should('not.have.class', 'visible').end();
        });

        it('On award.project=4DN view; BarPlot counts == QuickInfoBar counts', function(){

            cy.get('.bar-plot-chart .chart-bar').should('have.length.above', 0)
                .end().window().scrollTo(0, 200)
                .wait(300).get('#slow-load-container').should('not.have.class', 'visible').wait(1000).end()
                .screenshot().end()
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
                        .getQuickInfoBarCounts().its('experiment_sets').should('be.greaterThan', initialCounts.experiment_sets).wait(1000).end().screenshot().end().then(()=>{
                            compareQuickInfoCountsVsBarPlotCounts();
                        });
                });

            });

        });

        it('Counts persist on setting groupBy --> "Project"', function(){
            cy.getQuickInfoBarCounts().then((initialCounts)=>{
                cy.get('#select-barplot-field-1').click().wait(100).end()
                    .get('#select-barplot-field-1 + ul.dropdown-menu').within(($ul)=>{
                        return cy.contains('Project').click().wait(100);
                    }).end()
                    .getQuickInfoBarCounts().then((nextCounts)=>{
                        expect(nextCounts.experiment_sets).to.equal(initialCounts.experiment_sets);
                        expect(nextCounts.experiments).to.equal(initialCounts.experiments);
                        expect(nextCounts.files).to.equal(initialCounts.files);
                        compareQuickInfoCountsVsBarPlotCounts();
                    }).end();
            });
        });


        it('Counts persist on setting groupBy --> "Biosource"', function(){
            cy.getQuickInfoBarCounts().then((initialCounts)=>{
                cy.get('#select-barplot-field-1').click().wait(100).end()
                    .get('#select-barplot-field-1 + ul.dropdown-menu').within(($ul)=>{
                        return cy.contains('Biosource').click().wait(100);
                    }).end()
                    .getQuickInfoBarCounts().then((nextCounts)=>{
                        expect(nextCounts.experiment_sets).to.equal(initialCounts.experiment_sets);
                        expect(nextCounts.experiments).to.equal(initialCounts.experiments);
                        expect(nextCounts.files).to.equal(initialCounts.files);
                        cy.screenshot();
                        compareQuickInfoCountsVsBarPlotCounts();
                    }).end();
            });
        });


        it('Counts persist on setting xAxis --> "Biosource Type"', function(){
            cy.getQuickInfoBarCounts().then((initialCounts)=>{
                cy.get('#select-barplot-field-0').click().wait(100).end()
                    .get('#select-barplot-field-0 + ul.dropdown-menu').within(($ul)=>{
                        return cy.contains('Biosource Type').click().wait(100);
                    }).end()
                    .getQuickInfoBarCounts().then((nextCounts)=>{
                        expect(nextCounts.experiment_sets).to.equal(initialCounts.experiment_sets);
                        expect(nextCounts.experiments).to.equal(initialCounts.experiments);
                        expect(nextCounts.files).to.equal(initialCounts.files);
                        return cy.wait(100).end().get('.bar-plot-chart .chart-bar.transitioning').should('have.length', 0).wait(100).end().then(()=>{ // Wait until bars have transitioned.
                            cy.screenshot();
                            compareQuickInfoCountsVsBarPlotCounts();
                        });
                    }).end();
            });
        });


        it('Counts persist on setting groupBy --> "None"', function(){
            cy.getQuickInfoBarCounts().then((initialCounts)=>{
                cy.get('#select-barplot-field-1').click().wait(100).end()
                    .get('#select-barplot-field-1 + ul.dropdown-menu').within(($ul)=>{
                        return cy.contains('None').click().wait(100);
                    }).end()
                    .getQuickInfoBarCounts().then((nextCounts)=>{
                        expect(nextCounts.experiment_sets).to.equal(initialCounts.experiment_sets);
                        expect(nextCounts.experiments).to.equal(initialCounts.experiments);
                        expect(nextCounts.files).to.equal(initialCounts.files);
                        compareQuickInfoCountsVsBarPlotCounts({ 'skipLegend' : true }); // No legend when no groupBy
                    }).end();
            });
        });


        it('Counts persist on setting groupBy --> "Lab"', function(){
            cy.getQuickInfoBarCounts().then((initialCounts)=>{
                cy.get('#select-barplot-field-1').click().wait(100).end()
                    .get('#select-barplot-field-1 + ul.dropdown-menu').within(($ul)=>{
                        return cy.contains('Lab').click().wait(100);
                    }).end()
                    .getQuickInfoBarCounts().then((nextCounts)=>{
                        expect(nextCounts.experiment_sets).to.equal(initialCounts.experiment_sets);
                        expect(nextCounts.experiments).to.equal(initialCounts.experiments);
                        expect(nextCounts.files).to.equal(initialCounts.files);
                        compareQuickInfoCountsVsBarPlotCounts();
                    }).end();
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

        it.skip('Hover/pin bar part & click "Browse" for Bar Part --> filtered /browse/ results', function(){

            // TODO

        });

    });


});
