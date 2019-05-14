
describe('Browse Views - BarPlotChart & QuickInfoBar I', function () {

    context('Filtering using visualization elements', function(){

        before(()=>{
            cy.visit('/browse/?award.project=4DN&experimentset_type=replicate&type=ExperimentSetReplicate')
                .wait(300).get('#slow-load-container').should('not.have.class', 'visible').wait(300).end();
        });

        it('Initial UI state shows Experiment Types (x-axis) grouped by Organism', function(){
            cy.window().scrollTo(0, 0).end().get('#select-barplot-field-1').should('contain', 'Organism').end()
                .get('#select-barplot-field-0').should('contain', 'Experiment Type').end();
        });

        it('Hover over & click "2-stage Repli-seq, human" bar part + popover button --> matching filtered /browse/ results', function(){

            cy.window().scrollTo(0, 0).end()
                // A likely-to-be-here Bar Section - Repli-seq x human
                .get('.bar-plot-chart .chart-bar[data-term="2-stage Repli-seq"] .bar-part[data-term="human"]').then(($barPart)=>{
                    const expectedFilteredResults = parseInt($barPart.attr('data-count'));
                    expect(expectedFilteredResults).to.be.greaterThan(25);
                    expect(expectedFilteredResults).to.be.lessThan(40);
                    return cy.window().scrollTo('top').wait(200).end()
                        .get('.bar-plot-chart .chart-bar[data-term="Dilution Hi-C"] .bar-part[data-term="human"]').should('have.attr', 'data-count').wait(300).end()
                        .wrap($barPart).hoverIn().wait(100).end()
                        .get('.cursor-component-root .details-title').should('contain', 'Human').end()
                        .get('.cursor-component-root .detail-crumbs .crumb').should('contain', '2-stage Repli-seq').end()
                        .get('.cursor-component-root .details-title .primary-count').should('contain', expectedFilteredResults).end().getQuickInfoBarCounts().then((origCount)=>{
                            // `{ force: true }` is used a bunch here to prevent Cypress from attempting to scroll browser up/down during the test -- which may interfere w. mouse hover events.
                            // See https://github.com/cypress-io/cypress/issues/2353#issuecomment-413347535
                            return cy.window().then((w)=>{ w.scrollTo(0,0); }).end().wrap($barPart, { force: true }).scrollToCenterElement().wait(200).trigger('mouseover', { force: true }).trigger('mousemove', { force: true }).wait(300).click({ force : true }).wait(200).end()
                                .get('.cursor-component-root .actions.buttons-container .btn-primary').should('contain', "Explore").click({ force: true }).end() // Browser will scroll after click itself (e.g. triggered by app)
                                .location('search')
                                .should('include', 'experiments_in_set.experiment_type.display_title=2-stage+Repli-seq')
                                .should('include', 'experiments_in_set.biosample.biosource.individual.organism.name=human').wait(300).end()
                                .get('#slow-load-container').should('not.have.class', 'visible').end()
                                .get('.search-results-container .search-result-row').should('have.length', expectedFilteredResults).end()
                                .getQuickInfoBarCounts({ 'shouldNotEqual' : '' + origCount.experiment_sets }).its('experiment_sets').should('not.equal', origCount.experiment_sets).should('equal', expectedFilteredResults).end()
                                .get('.bar-plot-chart .chart-bar .bar-part').should('have.length', 1).end()
                                .window().screenshot("ATAC-seq x mouse BrowseView results, filtered via BarPlot section hover & click.").end();
                        });
                });
        });

        it("Can unselect currently-selected filters via QuickInfoBar filter panel", function(){
            cy.getQuickInfoBarCounts().then((origCounts)=>{
                cy.get('#stats .any-filters.glance-label').hoverIn().wait(100).end()
                    .get('#stats .bottom-side .chart-breadcrumbs .chart-crumb').should('have.length', 2).end()
                    .get('#stats .bottom-side .chart-breadcrumbs .chart-crumb[data-term="human"] i.icon-times').should('have.length', 1).click().wait(10).end()
                    .get('#stats .bottom-side .chart-breadcrumbs .chart-crumb[data-term="human"] i.icon-times').should('have.length', 0).end()
                    .get('#stats .bottom-side .chart-breadcrumbs .chart-crumb').should('have.length', 1).end()
                    .get('.bar-plot-chart .chart-bar .bar-part').should('have.length.greaterThan', 1).then(($allBarParts)=>{
                        const unfilteredOnceBarPartCount = $allBarParts.length;
                        cy.getQuickInfoBarCounts().its('experiment_sets').should('be.greaterThan', origCounts.experiment_sets).then((unfilteredOnceExpSetCount)=>{
                            cy.get('#stats .bottom-side .chart-breadcrumbs .chart-crumb[data-term="2-stage Repli-seq"] i.icon-times').should('have.length', 1).click().wait(10).end()
                                .get('#stats .bottom-side .chart-breadcrumbs .chart-crumb[data-term="2-stage Repli-seq"] i.icon-times').should('have.length', 0).end()
                                .get('.bar-plot-chart .chart-bar .bar-part').should('have.length.greaterThan', unfilteredOnceBarPartCount)
                                .getQuickInfoBarCounts().its('experiment_sets').should('be.greaterThan', unfilteredOnceExpSetCount).end()
                                .location('search').should('include', 'award.project=4DN')
                                .should('not.include', 'experiments_in_set.experiment_type.display_title=2-stage+Repli-seq').should('not.include', 'experiments_in_set.biosample.biosource.individual.organism.name=human');
                        });
                    });
            });

        });

    });


});
