import { navBrowseBtnSelector } from '../support/variables';

describe('Browse Views - Basic Tests', function () {

    context('Navigation and Redirection', function(){

        it('If start from home page, clicking on Browse All nav menu item gets us to Browse page.', function(){
            cy.visit('/');
            cy.get('#top-nav div.navbar-collapse .navbar-nav a.id-data-menu-item').click().wait(500).then(()=>{
            }).get(navBrowseBtnSelector).click().then(()=>{
                cy.get('#page-title-container .page-title').should('contain', 'Data Browser');
            });

        });

        it('Show external data including all results & "Include External Data" is on', function(){
            cy.location('search').should('include', 'ExperimentSetReplicate');
            cy.get('#stats .browse-base-state-toggle-container input[type="checkbox"]').should('be.checked');

        });


        it('If point browser to /browse/ page (no URL params), we also get redirected to Include External Data correctly.', function(){

            cy.visit('/');
            cy.visit('/browse/', { "failOnStatusCode" : false });

            // Wait for redirects: we should be taken from /browse/ to /browse/?award.project=4DN&experimentset_type=replicate&type=ExperimentSetReplicate
            cy.location('search').should('include', 'ExperimentSetReplicate');

        });

        it('There is at least 100 ExpSets in default browse view.', function(){
            cy.getQuickInfoBarCounts().its('experiment_sets').should('be.greaterThan', 99);
        });

        it('Switch between included and excluded properties in facets, exclude a term and check ExpSet counts', function(){

            cy.visit('/browse').wait(100).end()
                .getQuickInfoBarCounts().then((initialCounts) => {
                    let externalProjectCount;
                    cy.get(".facets-header .facets-title").should('have.text', 'Included Properties').end()
                        .get(".facets-header button").first().click().end()
                        .get(".facets-header .facets-title").should('have.text', 'Excluded Properties').end()
                        .get('.facet.closed[data-field="award.project"] > h5').scrollToCenterElement().click({ force: true }).end()
                        .get('.facet[data-field="award.project"] .facet-list-element[data-key="External"] a').within(($term) => {
                            cy.get('span.facet-count').then(function(facetCount){
                                externalProjectCount = parseInt(facetCount.text());
                                expect(externalProjectCount).to.be.greaterThan(0);
                            }).end();
                            cy.wrap($term).click().wait(1000).end();
                        }).end()
                        .getQuickInfoBarCounts().then((nextCounts)=>{
                            expect(nextCounts.experiment_sets).to.be.equal(initialCounts.experiment_sets - externalProjectCount);
                        });
                });
        });

        it('"/browse/?public_release.to=2017-10-31" redirects to correct URL, includes 100 < x < 150 results.', function(){
            cy.visit('/browse/?public_release.to=2017-10-31').end()
                .location('search').should('include','ExperimentSetReplicate' ).should('include', 'public_release.to=2017-10-31').end()
                .get('.bar-plot-chart .chart-bar').should('have.length.above', 0).end()
                .getQuickInfoBarCounts().its('experiment_sets').should('be.greaterThan', 100).should('be.lessThan', 150);
        });

        it('There is at least one Replaced item under the Status facet', function(){
            cy.get('.facet.closed[data-field="status"] > h5').scrollToCenterElement().click({ force: true }).end()
                .get('.facet[data-field="status"]').should('have.class', 'open').contains('Replaced');
        });

    });


});