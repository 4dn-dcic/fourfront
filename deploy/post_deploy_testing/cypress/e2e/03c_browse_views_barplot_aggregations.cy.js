
import _ from 'underscore';
import { compareQuickInfoCountsVsBarPlotCounts } from '../support/macros';

describe('Browse Views - BarPlotChart II', function () {

    context('Counts stay same or change expectedly upon re-requests of BarPlot data', function(){

        before(()=>{
            cy.visit('/browse/').wait(300).get('#slow-load-container').should('not.have.class', 'visible').wait(300).end();
        });

        it('In default view BarPlot, QuickInfoBar counts >= 1100', function(){
            cy.location('pathname').should('include', '/browse/').end()
                .location('search').should('include', 'type=ExperimentSetReplicate').end()
                .get('.bar-plot-chart .chart-bar').should('have.length.above', 0)
                .end().window().scrollTo(0, 200)
                .wait(300).get('#slow-load-container').should('not.have.class', 'visible').wait(1000).end()
                .getQuickInfoBarCounts().its('experiment_sets').should('be.greaterThan', 1460);
        });

        it('Toggling "Show External Data Off" ==> lower matching counts', function(){

            cy.getQuickInfoBarCounts().then((initialCounts)=>{

                cy.get('.browse-base-state-toggle-container label.onoffswitch-label').click().then(()=>{
                    cy.wait(1000) // Wait for 'slow-load-container' to become visible if needed, and wait for it to load
                        .get('#slow-load-container').should('not.have.class', 'visible').end()
                        .wait(250) // Wait for JS to init re-load of barplot data, then for it to have loaded.
                        .get('#select-barplot-field-1').should('not.have.attr', 'disabled').end()
                        .get('#stats-stat-expsets.stat-value:not(.loading)').should('have.length.greaterThan', 0).end()
                        .getQuickInfoBarCounts().its('experiment_sets').should('be.lessThan', initialCounts.experiment_sets).wait(1000).end();
                });

            });

        });

        it('Counts persist on setting groupBy --> "Project"', function(){
            cy.getQuickInfoBarCounts().then((initialCounts)=>{
                cy.get('#select-barplot-field-1').click().wait(100).end()
                    .get('#select-barplot-field-1 + div.dropdown-menu').within(function($ul){
                        return cy.contains('Project').click();
                    }).end().wait(1500)
                    .getQuickInfoBarCounts().then((nextCounts)=>{
                        expect(nextCounts.experiment_sets).to.equal(initialCounts.experiment_sets);
                        expect(nextCounts.experiments).to.equal(initialCounts.experiments);
                        expect(nextCounts.files).to.equal(initialCounts.files);
                        //compareQuickInfoCountsVsBarPlotCounts();
                    }).end();
            });
        });

        // Skipped because biosource might return more terms than allowed (30) and likely fail to have matching counts.
        it.skip('Counts persist on setting groupBy --> "Biosource"', function(){
            cy.getQuickInfoBarCounts().then((initialCounts)=>{
                cy.get('#select-barplot-field-1').click().wait(100).end()
                    .get('#select-barplot-field-1 + div.dropdown-menu').within(function($ul){
                        return cy.contains('Biosource').click();
                    }).end().wait(1500)
                    .getQuickInfoBarCounts().then((nextCounts)=>{
                        expect(nextCounts.experiment_sets).to.equal(initialCounts.experiment_sets);
                        expect(nextCounts.experiments).to.equal(initialCounts.experiments);
                        expect(nextCounts.files).to.equal(initialCounts.files);
                        compareQuickInfoCountsVsBarPlotCounts();
                    }).end();
            });
        });


        it('Counts persist on setting xAxis --> "Biosource Type"', function(){
            cy.getQuickInfoBarCounts().then((initialCounts)=>{
                cy.get('#select-barplot-field-0').click().wait(100).end()
                    .get('#select-barplot-field-0 + div.dropdown-menu').within(function($ul){
                        return cy.contains('Biosource Type').click();
                    }).end().wait(1500)
                    .getQuickInfoBarCounts().then((nextCounts)=>{
                        expect(nextCounts.experiment_sets).to.equal(initialCounts.experiment_sets);
                        expect(nextCounts.experiments).to.equal(initialCounts.experiments);
                        expect(nextCounts.files).to.equal(initialCounts.files);
                        return cy.wait(100).end().get('.bar-plot-chart .chart-bar.transitioning').should('have.length', 0).wait(100).end().then(()=>{ // Wait until bars have transitioned.
                            compareQuickInfoCountsVsBarPlotCounts();
                        });
                    }).end();
            });
        });


        it('Counts persist on setting groupBy --> "None"', function(){
            cy.getQuickInfoBarCounts().then((initialCounts)=>{
                cy.get('#select-barplot-field-1').click().wait(100).end()
                    .get('#select-barplot-field-1 + div.dropdown-menu').within(function($ul){
                        return cy.contains('None').click();
                    }).end().wait(1500)
                    .getQuickInfoBarCounts().then((nextCounts)=>{
                        expect(nextCounts.experiment_sets).to.equal(initialCounts.experiment_sets);
                        expect(nextCounts.experiments).to.equal(initialCounts.experiments);
                        expect(nextCounts.files).to.equal(initialCounts.files);
                        compareQuickInfoCountsVsBarPlotCounts({ 'skipLegend' : true }); // No legend when no groupBy
                    }).end();
            });
        });


        it('Counts persist on setting groupBy --> "Status"', function(){
            cy.window().scrollTo('top').end().getQuickInfoBarCounts().then((initialCounts)=>{
                cy.get('#select-barplot-field-1').click().wait(100).end()
                    .get('#select-barplot-field-1 + div.dropdown-menu').within(function($ul){
                        return cy.contains('Status').click();
                    }).end().wait(1500)
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

                cy.wait(100).login4DN({ 'email' : 'ud4dntest@gmail.com', 'useEnvToken' : false })
                    .get('#stats-stat-expsets').should('have.text', '').end()
                    .getQuickInfoBarCounts().its('experiment_sets').should('be.greaterThan', loggedOutCounts.experiment_sets).end().then(function(){
                        return compareQuickInfoCountsVsBarPlotCounts();
                    })
                    .logout4DN();

            });

        });

    });

});