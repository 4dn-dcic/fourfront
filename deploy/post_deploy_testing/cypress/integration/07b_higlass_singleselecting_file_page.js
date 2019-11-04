'use strict';

const searchUrl = "/search/?currentAction=selection&type=File&track_and_facet_info.track_title%21=No+value&higlass_uid%21=No+value&genome_assembly=GRCm38";

let allResultTotalCount = 0;

function checkFileCheckbox($checkBox) {
    return cy.wrap($checkBox).scrollToCenterElement().check({ 'force': true }).end();
}
function unCheckFileCheckbox($checkBox) {
    return cy.wrap($checkBox).scrollToCenterElement().uncheck({ 'force': true }).end();
}
/**
* Test higlass add data page single selected file.
*/
describe("Single Select Search Page (e.g. HiGlass Add File)", function () {

    context('Single select data', function () {

        it('Display page', function () {

            cy.visit(searchUrl).wait(100).end(); //Display single select file page
        });
        it('Checkbox checked ', function () {

            cy.get('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]').first().each(($checkBox, idx) =>
                checkFileCheckbox($checkBox).wait(2000)
            );
        });

        it('Selected file name for result matches file name', function () {

            cy.get('.sticky-page-footer .mt-0.mb-0').then(($selectedFileNameFooterDisplay) => {
                const selectedFileFooterDisplayName = $selectedFileNameFooterDisplay.text().replace('selected', '').trim(); //Selected checkbox data result value
                cy.get('.search-results-container .search-result-row .search-result-column-block .inner .title-block').first().each(($selectedFileName) => {
                    const selectedFileName = $selectedFileName.text(); //Selected data name value
                    expect(selectedFileFooterDisplayName).to.equal(selectedFileName);
                });
            });
        });
        it('Checkbox unchecked ', function () {

            cy.get('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]').each(($checkBox, idx) =>
                unCheckFileCheckbox($checkBox)
            );
        });
        it('Search box input works on submit', function () {
            cy.get('.above-results-table-row .text-500').then(($origTotalResults) => {

                let originalFileText = $origTotalResults.text();
                originalFileText = originalFileText.match(/\d/g);
                allResultTotalCount = parseInt(originalFileText.join(''));

                cy.get('input[name="q"]').focus().type('mouse').wait(10).end()
                    .get('form.navbar-search-form-container').submit().end()
                    .wait(1000).get('#slow-load-container').should('not.have.class', 'visible').end()
                    .searchPageTotalResultCount().should('be.greaterThan', 0).should('be.lessThan', allResultTotalCount);
            });

        });

        it('Search box cleared and submitted, total count matched', function () {
            cy.get('input[name="q"]').focus().clear().wait(10).end()
                .get('form.navbar-search-form-container').submit().end()
                .wait(1000).get('#slow-load-container').should('not.have.class', 'visible').end()
                .searchPageTotalResultCount().should('to.equal', allResultTotalCount);
        });
    });
});