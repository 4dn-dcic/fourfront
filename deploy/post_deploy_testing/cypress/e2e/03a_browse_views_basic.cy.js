import { navBrowseBtnSelector } from '../support/variables';

describe('Browse Views - Basic Tests', function () {

    context('Navigation and Redirection', function(){

        it('If start from home page, clicking on Browse All nav menu item gets us to Browse page.', function(){
            cy.visit('/');
            cy.get('#top-nav div.navbar-collapse .navbar-nav a.id-data-menu-item').click().then(()=>{
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

            let initialExpSetCount, excludeExpSetCount, includeExpSetCount, externalProjectCount;
            cy.visit('/browse').get('#slow-load-container').should('not.have.class', 'visible').end()
                .getQuickInfoBarCounts().then((initialCounts) => {
                    initialExpSetCount = initialCounts.experiment_sets;
                    expect(initialExpSetCount).to.be.greaterThan(0);
                }).end()
                .get(".facets-header .facets-title").should('have.text', 'Included Properties').end()
                .get(".facets-header button").first().click().end()
                .get(".facets-header .facets-title").should('have.text', 'Excluded Properties').end()
                .get('.facet.closed[data-field="award.project"] > h5').scrollToCenterElement().click({ force: true }).end()
                .get('.facet[data-field="award.project"] .facet-list-element[data-key="External"] a').within(($term) => {
                    cy.get('span.facet-count').then(function (facetCount) {
                        externalProjectCount = parseInt(facetCount.text());
                        expect(externalProjectCount).to.be.greaterThan(0);
                    }).end();
                    cy.wrap($term).click().get('span.facet-selector i.icon').should('have.class', 'icon-minus-square').end();
                }).end()
                .get('#stats-stat-expsets').should('contain', '/').end()
                .getQuickInfoBarCounts().then((nextCounts1) => {
                    excludeExpSetCount = nextCounts1.experiment_sets;
                    expect(excludeExpSetCount).to.be.equal(initialExpSetCount - externalProjectCount);
                })
                .get(".facets-header button").first().click().end()
                .get(".facets-header .facets-title").should('have.text', 'Included Properties').end()
                .get('.facet[data-field="award.project"] .facet-list-element[data-key="External"] a').within(($term) => {
                    cy.wrap($term).click().get('span.facet-selector i.icon').should('have.class', 'icon-square').end();
                }).end() //reset
                .getQuickInfoBarCounts().then((nextCounts2) => {
                    expect(initialExpSetCount).to.be.equal(nextCounts2.experiment_sets);
                }).end()
                .get('.facet[data-field="award.project"] .facet-list-element[data-key="External"] a').within(($term) => {
                    cy.wrap($term).click().get('span.facet-selector i.icon').should('have.class', 'icon-check-square').end();
                }).end()
                .get('#stats-stat-expsets').should('contain', '/').end()
                .getQuickInfoBarCounts().then((nextCounts3) => {
                    includeExpSetCount = nextCounts3.experiment_sets;
                    expect(includeExpSetCount).to.be.equal(externalProjectCount);
                }).end();

        });

        it('Select a grouping term in Experiment Type facet, then check whether the sub-terms are also selected', function () {

            cy.visit('/browse').get('#slow-load-container').should('not.have.class', 'visible').end()
                .get(".facets-header .facets-title").should('have.text', 'Included Properties').end()
                .get('.facet.closed[data-field="experiments_in_set.experiment_type.display_title"] > h5').scrollIntoView().should('be.visible').click().end()
                .get('.facet.open[data-field="experiments_in_set.experiment_type.display_title"] .facet-list-element[data-is-grouping="true"] a').first().within(($term) => {
                    const subTerms = [], subTermsSelected = [];
                    let groupingTermKey;
                    cy.get('span.facet-item.facet-item-group-header').then(function (termKey) {
                        groupingTermKey = termKey.text();
                        expect(groupingTermKey).to.not.be.empty;
                        cy.root()
                            .closest('.facet[data-field="experiments_in_set.experiment_type.display_title"]')
                            .find('.facet-list-element[data-grouping-key="' + groupingTermKey + '"] a').each(($el) => {
                                cy.wrap($el).find('span.facet-item').then(function (termKey) {
                                    const subTermKey = termKey.text();
                                    subTerms.push(subTermKey);
                                    expect(subTermKey).to.not.be.empty;
                                }).end();
                            }).then(() => {
                                expect(subTerms.length).to.be.greaterThan(0);
                            });
                    }).end();
                    cy.wrap($term).click().end().then(() => {
                        cy.document().its('body').find('.facet[data-field="experiments_in_set.experiment_type.display_title"] .facet-list-element[data-grouping-key="' + groupingTermKey + '"].selected a').each(($el) => {
                            cy.wrap($el).find('span.facet-item').then(function (termKey) {
                                const subTermKey = termKey.text();
                                subTermsSelected.push(subTermKey);
                                expect(subTermKey).to.not.be.empty;
                            }).end();
                        }).then(() => {
                            expect(subTerms.length).to.equal(subTermsSelected.length);
                            cy.wrap(subTerms).should('deep.equal', subTermsSelected);
                        });
                    });
                }).end();
        });

        it('Exclude a grouping term in Experiment Type facet, then check whether the sub-terms are also excluded', function () {

            cy.visit('/browse').get('#slow-load-container').should('not.have.class', 'visible').end()
                .get(".facets-header button").first().click().end()
                .get(".facets-header .facets-title").should('have.text', 'Excluded Properties').end()
                .get('.facet.closed[data-field="experiments_in_set.experiment_type.display_title"] > h5').scrollIntoView().should('be.visible').click().end()
                .get('.facet[data-field="experiments_in_set.experiment_type.display_title"] .facet-list-element[data-is-grouping="true"] a').eq(1).within(($term) => {
                    const subTerms = [], subTermsSelected = [];
                    let groupingTermKey;
                    cy.get('span.facet-item.facet-item-group-header').then(function (termKey) {
                        groupingTermKey = termKey.text();
                        expect(groupingTermKey).to.not.be.empty;
                        cy.root()
                            .closest('.facet[data-field="experiments_in_set.experiment_type.display_title"]')
                            .find('.facet-list-element[data-grouping-key="' + groupingTermKey + '"] a').each(($el) => {
                                cy.wrap($el).find('span.facet-item').then(function (termKey) {
                                    const subTermKey = termKey.text();
                                    subTerms.push(subTermKey);
                                    expect(subTermKey).to.not.be.empty;
                                }).end();
                            }).then(() => {
                                expect(subTerms.length).to.be.greaterThan(0);
                            });
                    }).end();
                    cy.wrap($term).click().end().then(() => {
                        cy.document().its('body').find('.facet[data-field="experiments_in_set.experiment_type.display_title"] .facet-list-element[data-grouping-key="' + groupingTermKey + '"].omitted a').each(($el) => {
                            cy.wrap($el).find('span.facet-item').then(function (termKey) {
                                const subTermKey = termKey.text();
                                subTermsSelected.push(subTermKey);
                                expect(subTermKey).to.not.be.empty;
                            }).end();
                        }).then(() => {
                            expect(subTerms.length).to.equal(subTermsSelected.length);
                            cy.wrap(subTerms).should('deep.equal', subTermsSelected);
                        });
                    });
                }).end();
        });

        it('"/browse/?public_release.to=2017-10-31" redirects to correct URL, includes 100 < x < 150 results.', function(){
            cy.visit('/browse/?public_release.to=2017-10-31').get('#slow-load-container').should('not.have.class', 'visible').end()
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