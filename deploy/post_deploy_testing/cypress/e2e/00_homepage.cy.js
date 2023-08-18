import _ from 'underscore';

describe('Home Page', function () {

    it('Has correct title & subtitle', function () {

        cy.visit('/').end()
            .title().should('include', '4DN Data Portal').end()
            .get('#page-title-container .page-title').should('contain', '4D Nucleome Data Portal').end()
            .get('#page-title-container div.subtitle').should('have.text', 'A platform to search, visualize, and download nucleomics data.');

    });


    it('Has log in/register button having #loginbtn', function() {
        cy.get('#loginbtn').should('contain', 'Log In');
    });


    it('Has recently released datasets has 2+ rows', function () {
        cy.get('.datasets-and-social-connections-col-datasets .search-results-container')
            .find('.search-result-row div.search-result-column-block[data-col="dataset"]').should('have.length.of.at.least', 2);
    });

    it('Recently released dataset\'s exp. set count and browse page\'s result count matches', function () {
        cy.get('.datasets-and-social-connections-col-datasets .search-results-container')
            .find('.search-result-row div.search-result-column-block[data-col="expset_count"]').then(function ($colExpSetCount) {
                const links = [];

                Cypress._.forEach($colExpSetCount, function (col) {
                    const $col = Cypress.$(col);
                    const expSetCount = parseInt($col.attr('data-exp-set-count'));

                    expect(expSetCount).to.be.greaterThan(0);

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

    it('Recently released dataset\'s lab navigates to the lab page, and the experiment sets tab has data', function () {

        cy.visit('/').end();

        cy.get('.datasets-and-social-connections-col-datasets .search-results-container')
            .find('.search-result-row div.search-result-column-block[data-col="lab"] a').then(function ($labs) {
                const links = [];

                Cypress._.forEach($labs, function (lab) {
                    const $a = Cypress.$(lab);
                    const href = $a.attr('href');
                    const labName = $a.text();
                    if (!_.any(links, (link) => link.href == href)) {
                        links.push({ href, labName });
                    }
                }).end();

                cy.wrap(links).each(function ({ href, labName }) {
                    cy.visit(href).end();
                    cy.location('pathname').should('include', '/labs/').end()
                        .get('h1.page-title').should('contain', labName).end()
                        .get('div.rc-tabs span[data-tab-key="expsets-table"]').wait(200).click().end().wait(500)
                        .get('.rc-tabs-tabpane.rc-tabs-tabpane-active .search-results-container .search-result-row[data-row-number]').should('have.length.greaterThan', 0).end();
                });
            });
    });

    it.skip('Has Twitter feed w. 5+ tweets', function() {
        cy.visit('/').end();
        // https://github.com/cypress-io/cypress/issues/136
        cy.get('.home-content-area div.twitter-timeline-container iframe#twitter-widget-0')
            .iframe()
            .find('[data-testid="tweetText"]').should('have.length.of.at.least', 5);
    });

    it('"Toggle External Data" affects Chart', function () {

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

