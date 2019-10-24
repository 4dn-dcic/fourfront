'use strict';


const draftUrl = "/search/?currentAction=selection&type=File&track_and_facet_info.track_title%21=No+value&higlass_uid%21=No+value&genome_assembly=GRCm38";


function checkFileCheckbox($checkBox) {
    return cy.wrap($checkBox).scrollToCenterElement().check({ 'force': true }).end()
}
function unCheckFileCheckbox($checkBox) {
    return cy.wrap($checkBox).scrollToCenterElement().uncheck({ 'force': true }).end()
}
/**
* Test higlass add data page single selected file.
*/
describe("Single selecting data page", function () {

    context('Single select data', function () {

        it('Display page', function () {

            cy.visit(draftUrl).wait(100).end() //Display singleselect file page
        });
        it('Checkbox checked ', function () {

            cy.get('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]').first().each(($checkBox, idx) => {
                return checkFileCheckbox($checkBox).wait(2000);
            });
        });

        it('Selected file name for result matches file name.', function () {

            cy.get('.sticky-page-footer .mt-03.mb-0').then(($selectedFileNameFooterDisplay) => {
                const selectedFileFooterDisplayName = $selectedFileNameFooterDisplay.text().replace('selected', '').trim();  //Selected checkbox data result value 
                cy.get('.search-results-container .search-result-row .search-result-column-block .inner .title-block').first().each(($selectedFileName) => {
                    const selectedFileName = $selectedFileName.text();   //Selected data name value 
                    expect(selectedFileFooterDisplayName).to.equal(selectedFileName);
                });
            });
        });
        it('Checkbox unchecked ', function () {

            cy.get('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]').each(($checkBox, idx) => {
                return unCheckFileCheckbox($checkBox);
            });
        });

    });
});