
/**
* Test you can visit the Vitessce page.
*/
describe('Vitessce display page', function () {

    context('Vitessce search page', function () {

        before(function () { // beforeAll
            cy.visit('/search/');
        });

        it('Ensure logged in, then search FileMicroscopy items that are Vitessce compatible', function () {
            cy.login4DN({ 'email': '4dndcic@gmail.com', 'useEnvToken': true }).wait(1000)
                .visit('/search/?type=FileMicroscopy&tags=vitessce')
                .searchPageTotalResultCount().should('be.greaterThan', 0).end()
                .get('.search-results-container .search-result-row[data-row-number="0"] .search-result-column-block[data-field="display_title"] a').click({ force: true }).wait(200).end();
        });

        it('Preview a Vitessce-compatible item, check viewer is loaded and displays the image correctly', function () {
            cy.login4DN({ 'email': '4dndcic@gmail.com', 'useEnvToken': true }).wait(1000);
            cy.window().then(function (w) {
                cy.location('pathname').should('not.equal', "/")
                    .then(function (pathName) {
                        pathName = Cypress._.filter(pathName.split('/'));
                        const fileAccession = pathName[pathName.length - 1];
                        cy.wrap(fileAccession).as('fileAccession');
                        console.log('File accession:', fileAccession);
                    }).wait(3000).end()
                    .get('h1.page-title').should('not.be.empty').end()
                    .get('div.rc-tabs span[data-tab-key="file-vitessce"]').should('contain', 'Vitessce').end();
                cy.get('div.rc-tabs span[data-tab-key="file-vitessce"]').click({ 'force': true }).end();
                cy.get("h3.tab-section-title, h4.tab-section-title").should('contain.text', 'Vitessce Visualization').end();
                cy.get('div.vit2 div.vit3').each(function ($title, index) {
                    if (index === 0) {
                        expect($title[0].innerText).to.eql('Spatial');
                    } else if (index == 1) {
                        expect($title[0].innerText).to.eql('Spatial Layers');
                    }
                }).end().get('@fileAccession').then((fileAccession) => cy.get('[id="layer-' + fileAccession + '.ome.tiff-controls"]').should('exist'));
            }).end().wait(3000);
        });
    });
});
