'use strict';

const searchUrl = "/search/?currentAction=multiselect&type=File&track_and_facet_info.track_title%21=No+value&higlass_uid%21=No+value&genome_assembly=GRCm38";

let selectedCheckFileNumberCount = 0;
let allResultTotalCount = 0;

function checkFileCheckbox($checkBox) {
    selectedCheckFileNumberCount += 1;
    return cy.wrap($checkBox).scrollToCenterElement().check({ 'force': true }).end();
}
function unCheckFileCheckbox($checkBox) {
    selectedCheckFileNumberCount -= 1;
    if (selectedCheckFileNumberCount >= 0) {
        return cy.wrap($checkBox).scrollToCenterElement().uncheck({ 'force': true }).end();
    }
}
/**
* Test  higlass add data page multi selected file.
*/
describe("Multiselect Search Page (e.g. HiGlass Add File)", function () {


    context('Selected file', function () {

        it('Display page', function () {
            cy.visit(searchUrl).wait(100).end();//Display multiselect file page

        });
        it('Can press buttons at right & left to scroll to right side of search results table', function () {
            cy.get('#content div.shadow-border-layer div.edge-scroll-button.right-edge:not(.faded-out)').trigger('mousedown', { 'button': 0, 'force': true })
                .should('have.class', 'faded-out') // Scroll until scrolling further is disabled.
                .trigger('mouseup', { 'force': true }) // Might become invisible
                .wait(1000) // Wait for state changes re: layouting to take effect
                .end()
                .get('#content div.shadow-border-layer div.edge-scroll-button.left-edge:not(.faded-out)')
                .trigger('mousedown', { 'button': 0, 'force': true })
                .should('have.class', 'faded-out')
                .trigger('mouseup', { 'force': true })
                .wait(1000)
                .end();
        });

        it('Checkboxes are checked', function () {
            cy.get('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]').each(($checkBox, idx) =>
                checkFileCheckbox($checkBox).end()
            );
        });

        it('Number of files selected for result matches file count', function () {

            cy.get('.sticky-page-footer .mt-0.mb-0').then(($selectedIndexCount) => {

                const selectedFileText = $selectedIndexCount.text();
                let selectedFileCount = selectedFileText.match(/\d/g);
                selectedFileCount = parseInt(selectedFileCount.join(''));
                expect(selectedCheckFileNumberCount).to.equal(selectedFileCount);
            });
        });
        it('Checkboxes are unchecked ', function () {
            cy.get('.above-results-table-row .text-500').then(($asd) => {

                cy.get('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]').each(($checkBox, idx) =>
                    unCheckFileCheckbox($checkBox)
                );
            });
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