'use strict';

const searchUrl = "/search/?currentAction=selection&type=File&track_and_facet_info.track_title%21=No+value&higlass_uid%21=No+value&genome_assembly=GRCm38";

let allResultTotalCount = 0;

function checkFileCheckbox($checkBox) {
    return cy.wrap($checkBox).scrollToCenterElement().check({ 'force': true }).end();
}
function unCheckFileCheckbox($checkBox) {
    return cy.wrap($checkBox).scrollToCenterElement().uncheck({ 'force': true }).end();
}

describe("Single Select Search Page (e.g. HiGlass Add File)", function () {

    context('Single select data', function () {

        it('Display file select page (single selection)', function () {
            cy.visit(searchUrl).get('h1.page-title .page-subtitle').should('have.text', 'Select an Item and click the Apply button.').end();
        });

        it('Select first item', function () {
            cy.get('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]').first().then(($checkBox) =>
                checkFileCheckbox($checkBox).get('.selection-controls-footer h4').first().should('contain', '4DNFI').end()
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

        it('Checkbox unchecked', function () {

            cy.get('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]').each(($checkBox, idx) =>
                unCheckFileCheckbox($checkBox)
            );
        });

        it('None of the rows selected and Nothing is displayed in footer', function () {
            cy.get('.sticky-page-footer .mt-0.mb-0').then(($selectedFileNameFooterDisplay) => {
                const selectedFileFooterDisplayName = $selectedFileNameFooterDisplay.text().replace('selected', '').trim();
                expect(selectedFileFooterDisplayName).to.equal('Nothing');
            });
        });

        it('Search box input works on submit', function () {
            cy.get('.above-results-table-row .text-500').then(($origTotalResults) => {

                let originalFileText = $origTotalResults.text();
                originalFileText = originalFileText.match(/\d/g);
                allResultTotalCount = parseInt(originalFileText.join(''));

                cy.get('input[name="q"]').focus().type('mouse', { delay: 0 }).end()
                    .get('form.navbar-search-form-container').submit().end()
                    .get('#slow-load-container').should('not.have.class', 'visible').end()
                    .searchPageTotalResultCount().should('be.greaterThan', 0).should('be.lessThan', allResultTotalCount);
            });

        });

        it('Search box cleared and submitted, total count matched', function () {
            cy.get('input[name="q"]').focus().clear().end()
                .get('form.navbar-search-form-container').submit().end()
                .get('#slow-load-container').should('not.have.class', 'visible').end()
                .searchPageTotalResultCount().should('to.equal', allResultTotalCount);
        });

    });
});