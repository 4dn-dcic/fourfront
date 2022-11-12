
describe('Home Page', function () {

    it('Has correct title & subtitle', function () {

        cy.visit('/').end()
            .title().should('include', '4DN Data Portal').end()
            .get('#page-title-container .page-title').should('contain', '4D Nucleome Data Portal').end()
            .get('#page-title-container div.subtitle').should('have.text', 'A platform to search, visualize, and download nucleomics data.');

    });


    it.skip('Has log in/register button having #loginbtn', function() {
        cy.get('#loginbtn').should('contain', 'Log In');
    });


    it('Has recently released datasets has 2+ rows', function() {
        cy.get('.recently-released-datasets-section .search-results-container')
            .find('.search-result-row div.search-result-column-block[data-col="dataset"]').should('have.length.of.at.least', 2);

        cy.get('.recently-released-datasets-section .search-results-container')
            .find('.search-result-row div.search-result-column-block[data-col="expset_count"]').then(function ($colExpSetCount) {
                const links = [];

                Cypress._.forEach($colExpSetCount, function (col) {
                    const $col = Cypress.$(col);
                    const expSetCount = parseInt($col.attr('data-exp-set-count'));
                    cy.wrap(col).within(() => {
                        cy.get('a').then(($a) => {
                            const href = $a.attr('href');
                            links.push({ href, expSetCount });
                        });
                    }).end();
                }).end();

                cy.wrap(links).each(function ({ href, expSetCount }) {
                    cy.visit(href).end();
                    cy.getQuickInfoBarCounts().its('experiment_sets').should('equal', expSetCount).end();
                });
            });
    });

    it.skip('Has Twitter feed w. 5+ tweets', function() {
        // https://github.com/cypress-io/cypress/issues/136
        cy.get('.home-content-area div.twitter-timeline-container iframe#twitter-widget-0')
            .iframe()
            .find('[data-testid="tweetText"]').should('have.length.of.at.least', 5);
    });

    it.skip('"Toggle External Data" affects Chart', function () {

        cy.window().scrollTo('top').wait(100).end()
            .getQuickInfoBarCounts().then((initialCounts) =>
                cy.get('#stats .browse-base-state-toggle-container input[type="checkbox"]').should('be.checked').uncheck({ force: true }).wait(1500).end()
                    .getQuickInfoBarCounts().then((nextCounts) => {
                        expect(nextCounts.experiment_sets).to.be.lessThan(initialCounts.experiment_sets);
                        expect(nextCounts.experiments).to.be.lessThan(initialCounts.experiments);
                        expect(nextCounts.files).to.be.lessThan(initialCounts.files);
                    }).end()
            );

    });

});

