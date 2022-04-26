
/**
* Test you can visit the Vitessce page.
*/
describe('Vitessce display page', function () {

    context('Vitessce search page', function () {

        before(function () { // beforeAll
            cy.visit('/search/');
        });

        it('Ensure logged in, visit vitesse search page ', function () {
            cy.login4DN({ 'email': '4dndcic@gmail.com', 'useEnvToken': true }).wait(1000)
                .visit('/search/?type=FileMicroscopy&tags=vitessce')
                .searchPageTotalResultCount().should('be.greaterThan', 1).end();

            let intervalCount = null;
            cy.searchPageTotalResultCount().then((totalCountExpected) => {
                intervalCount = Math.min(0, parseInt(totalCountExpected / 3));
            });

            cy.scrollToBottom().then(() => {
                cy.get('.search-results-container .search-result-row[data-row-number="' + intervalCount + '"] .search-result-column-block[data-field="display_title"] a').click({ force: true }).wait(200).end();
            }).end();

        });

        it('Preview vitessce', function () {
            cy.window().then(function (w) {
                let currPagePath = "/";
                cy.location('pathname').should('not.equal', currPagePath)
                    .then(function (pathName) {
                        currPagePath = pathName;
                        console.log(currPagePath);
                    }).wait(3000).end()
                    .get('h1.page-title').should('not.be.empty').end()
                    .get('div.rc-tabs span[data-tab-key="file-vitessce"]').should('contain', 'Vitessce').end();
                cy.get('div.rc-tabs span[data-tab-key="file-vitessce"]').click({ 'force': true }).end();
                cy.get("h3.tab-section-title, h4.tab-section-title").should('contain.text', 'Vitessce Visualization').end();
                cy.get('div.title .title-left').each(function ($title, index) {
                    if (index === 0) {
                        expect($title[0].innerText).to.eql('Spatial');
                    }
                    else if (index == 1) {
                        expect($title[0].innerText).to.eql('Spatial Layers');
                    }
                }).end()
                    .wait(2000).login4DN({ 'email': '4dndcic@gmail.com', 'useEnvToken': true }).wait(1000);

            }).end().wait(3000);
        });
    });
});