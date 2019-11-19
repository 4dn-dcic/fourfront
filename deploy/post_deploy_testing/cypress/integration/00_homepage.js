

describe('Home Page', function () {

    it('Has correct title & subtitle', function () {

        cy.visit('/').end()
            .title().should('include', '4DN Data Portal').end()
            .get('#page-title-container span.title').should('have.text', '4D Nucleome Data Portal').end()
            .get('#page-title-container div.subtitle').should('have.text', 'A platform to search, visualize, and download nucleomics data.');

    });


    it('Has introduction (indexed)', function () {

        cy.get('.home-content-area h2.homepage-section-title').should('contain', 'Introduction').end()
            .get('.home-content-area h2.homepage-section-title + div').should('contain', "The 4D Nucleome Network aims to understand the principles");

    });


    it('Has carousel', function () {
        cy.get('.homepage-carousel-wrapper .slider-frame ul.slider-list li').should('have.length.of.at.least', 2);
    });


    it('Has 3+ announcements', function () {

        cy.window().scrollTo('bottom').wait(100).end()
            .get('.home-content-area div.announcement').should('have.length.greaterThan', 2).end();

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

