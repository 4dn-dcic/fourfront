/**
* Test you can visit the statistics page.
*/
describe('Submissions and Usage Statistics page', function () {

    context('Submissions and Usage Statistics page', function () {

        it('Has correct title & tabs', function () {

            cy.visit('/statistics').end()
                .title().should('include', 'Portal Statistics (BETA)').end()
                .get('.chart-section-control-wrapper.row a.select-section-btn[href="#submissions"]').should('contain', 'Submissions Statistics').end()
                .get('.chart-section-control-wrapper.row a.select-section-btn[href="#usage"]').should('contain', 'Usage Statistics').end();
        });

        it('Usage statistics tab displays the Page Views charts', function () {
            cy.get('.chart-section-control-wrapper.row a.select-section-btn[href="#usage"]').then(function ($tabBtn) {
                cy.wrap($tabBtn).click().end();
                cy.get('#usage.stats-charts-container .chart-group .charts-group-title').should('contain', 'Page Views').end();
            });
        });

        it('Submission statistics tab displays the Experiment Sets, Files and Total File Size charts', function () {
            cy.get('.chart-section-control-wrapper.row a.select-section-btn[href="#submissions"]').then(function ($tabBtn) {
                cy.wrap($tabBtn).click().end();
                cy.get('#submissions.stats-charts-container .legend').should('contain', '4DN').end();
                cy.get('#submissions.stats-charts-container .chart-group > div.mt-2').each(($el, index, $list) => {
                    switch (index) {
                        case 0:
                            cy.wrap($el).should('contain', 'Experiment Sets');
                            break;
                        case 1:
                            cy.wrap($el).should('contain', 'Files');
                            break;
                        case 2:
                            cy.wrap($el).should('contain', 'Total File Size');
                            break;
                    }
                });
            });
        });
    });
});
