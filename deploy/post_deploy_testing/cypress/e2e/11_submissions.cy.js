
/**
* Test you can visit the Submission page.
*/
describe('Submission Page Tests', function () {

    context('My Submissions, Submissions for My Lab', function () {

        it('Ensure logged in, visit submission page ', function () {
            // Login CypressTest user
            cy.visit('/submissions').end()
                .get('#page-title-container .page-title').should('contain', 'Submissions');
            cy.login4DN({ 'email': 'u4dntestcypress@gmail.com', 'useEnvToken': true }).end();

        });

        it('Check the total count of My Submissions', function () {
            let totalCount;
            cy.login4DN({ 'email': 'u4dntestcypress@gmail.com', 'useEnvToken': true }).end()
                .get('#content .submission-page-heading .col.text-400.pt-01').contains('My submissions').end();
            cy.get('.submission-page-heading[data-open=true] .ml-1.text-300').then(function ($submissionTotalCountText) {
                const totalCountText = $submissionTotalCountText.text();
                totalCount = parseInt(totalCountText.replace(/[\])}[{(]/g, ''));
                expect(totalCount).to.be.greaterThan(0);
            });
        });

        it('My Submissions filter by item type dropdown', function () {
            let totalCount;
            let typeTitle;
            cy.get('.submission-page-heading[data-open=true] .ml-1.text-300').then(function ($submissionTotalCountText) {
                const totalCountText = $submissionTotalCountText.text();
                totalCount = parseInt(totalCountText.replace(/[\])}[{(]/g, ''));
                const intervalCount = Math.min(1, parseInt(totalCount / 25));
                cy.get('.search-result-row.detail-closed[data-row-number="' + intervalCount + '"] .search-result-column-block[data-field="@type"] .item-type-title').then(function ($typeTitle) {
                    typeTitle = $typeTitle.text().trim();
                })
                    .get('.search-result-row.detail-closed[data-row-number="' + intervalCount + '"] .search-result-column-block[data-field="@type"] .icon-container .icon').click({ force: true }).end();

            }).end();
            cy.get('.dropdown .dropdown-toggle').should('not.have.text', 'All').then(function ($selectedTypeTitle) {
                const selectedTypeTitle = $selectedTypeTitle.text().trim();
                cy.expect(typeTitle).equal(selectedTypeTitle);
            });
        });

        it('Check the total count of Submissions for My Lab', function () {
            cy.visit('/submissions').end()
                .get('#page-title-container .page-title').should('contain', 'Submissions');
            cy.login4DN({ 'email': 'u4dntestcypress@gmail.com', 'useEnvToken': true }).end();
            let totalCount;
            cy.get('.submission-page-heading[data-open=false] .col.text-400.pt-01').contains('Submissions for my lab').end();
            cy.get('.submission-page-heading[data-open=false] .btn.btn-default.icon-container').click({ 'force': true });
            cy.get(".submission-page-heading[data-open=true] .btn.btn-default.icon-container").first().click({ 'force': true }).end();
            cy.get('.submission-page-heading[data-open=true] .ml-1.text-300').then(function ($submissionForLabTotalCountText) {
                const totalCountText = $submissionForLabTotalCountText.text();
                totalCount = parseInt(totalCountText.replace(/[\])}[{(]/g, ''));
                expect(totalCount).to.be.greaterThan(0);
            });
            cy.get('.submission-page-heading[data-open=true] .btn.btn-default.icon-container').click({ 'force': true });
        });

    });

});

