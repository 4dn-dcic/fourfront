function checkUncheckFileCheckbox(origSelectedCount, $checkBox) {
    return cy.wrap($checkBox).scrollToCenterElement().uncheck({ 'force': true }).end()
        .getDownloadButton().invoke('text').then((downloadButtonTextContent) => {
            let nextSelectedCount = downloadButtonTextContent.match(/\d/g);
            nextSelectedCount = parseInt(nextSelectedCount.join(''));
            expect(nextSelectedCount).to.be.lessThan(origSelectedCount);
            return cy.getSelectAllFilesButton().should('not.contain', "Deselect All");
        }).end().wrap($checkBox).check({ 'force': true }).end()
        .getDownloadButton().invoke('text').then((downloadButtonTextContent) => {
            let nextSelectedCount = downloadButtonTextContent.match(/\d/g);
            nextSelectedCount = parseInt(nextSelectedCount.join(''));
            expect(nextSelectedCount).to.equal(origSelectedCount);
            return cy.getSelectAllFilesButton().should('contain', "Deselect All");
        });

}
let fileTypeSelectedTotalCount = 0;
function fileTypeFilterCheckFileCheckbox(origSelectedCount, $checkBox) {
    return cy.wrap($checkBox).scrollToCenterElement().check({ 'force': true }).end()
        .getDownloadButton().invoke('text').then((downloadButtonTextContent) => {
            const nextSelectedCount = downloadButtonTextContent.match(/\d/g);
            fileTypeSelectedTotalCount = parseInt(nextSelectedCount.join(''));
        });
}
function fileTypeFilterUnCheckFileCheckbox($checkBox) {
    return cy.wrap($checkBox).scrollToCenterElement().uncheck({ 'force': true }).end();
}
describe('Browse Views - Files Selection', function () {

    context('Ensure "Select All Files" & related features are functional.', function () {

        before(function () {
            cy.visit('/browse/?award.project=4DN&experimentset_type=replicate&type=ExperimentSetReplicate&experiments_in_set.experiment_type.display_title=CUT%26RUN');
        });

        it('We have some counts in QuickInfoBar to compare selected file counts against.', function () {

            cy.get('#select-barplot-field-1').should('not.have.attr', 'disabled').end()
                .getQuickInfoBarCounts().then((counts) => {
                    expect(counts.experiment_sets).to.be.greaterThan(6);
                    expect(counts.files).to.be.greaterThan(20);
                });

        });

        it("Can add column for date_created to results table", function () {
            // First we must add the column to the view
            // Open column selector panel
            cy.get('#content div.above-results-table-row div.right-buttons button.btn[data-tip="Configure visible columns"]').click().end()
                // Check the 'Date Created' checkbox
                .get('#content .search-result-config-panel div input[type="checkbox"][value="date_created"]')
                .scrollIntoView().click({ 'force': true }).end()
                // Perform check for initial expected condition (sort by date_created -- descending)
                .get('.search-headers-row .search-headers-column-block[data-field="date_created"] .column-sort-icon')
                .should('have.class', 'active')
                .within(() => {
                    cy.get('i').should('have.class', 'icon-sort-down');
                }).end()
                // Close columns panel
                .get('#content div.above-results-table-row div.right-buttons button.btn[data-tip="Configure visible columns"]').click().end();
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
                .end()
                .get('#content div.shadow-border-layer div.edge-scroll-button.right-edge:not(.faded-out)').trigger('mousedown', { 'button': 0, 'force': true })
                .should('have.class', 'faded-out')
                .trigger('mouseup', { 'force': true }) // Might become invisible
                .end();
        });

        it('Can change to sort by date_created -- ascending', function () {

            cy.scrollTo(0, 500)
                .get('.search-headers-row .search-headers-column-block[data-field="date_created"] .column-sort-icon')
                .click({ 'force': true })
                .should('have.class', 'active').end()
                .get('.search-headers-row .search-headers-column-block[data-field="date_created"] .column-sort-icon i')
                .should('have.class', 'icon-sort-up').end();
        });

        it('"Select All Files" button works & becomes "Deselect All" after.', function () {

            cy.getSelectAllFilesButton().click().should('contain', "Deselect All").end()
                .getDownloadButton().should('not.have.attr', 'disabled').end();

        });

        it('Number of files selected for download matches QuickInfoBar file count.', function () {

            cy.getQuickInfoBarCounts().then(function (counts) {
                return cy.getDownloadButton().invoke('text').then((downloadButtonTextContent) => {
                    let foundNum = downloadButtonTextContent.match(/\d/g);
                    foundNum = parseInt(foundNum.join(''));
                    expect(foundNum).to.equal(counts.files);
                });
            });
        });

        it('File Type selection filtering by file type will likely change', function () {

            cy.getFileTypePanelButton().click().should('not.contain', "Deselect All").end();
            cy.getDownloadButton().invoke('text').then((downloadButtonTextContent) => {
                let origSelectedCount = downloadButtonTextContent.match(/\d/g);
                origSelectedCount = parseInt(origSelectedCount.join(''));
                return cy.get('.search-result-config-panel input[type="checkbox"]').each(($checkBox, idx) =>
                    fileTypeFilterCheckFileCheckbox(origSelectedCount, $checkBox)
                );
            });
        });

        it('File Type selection count matches download file count', function () {

            cy.getDownloadButton().invoke('text').then((downloadButtonTextContent) => {
                let origSelectedCount = downloadButtonTextContent.match(/\d/g);
                origSelectedCount = parseInt(origSelectedCount.join(''));
                return expect(origSelectedCount).to.be.equal(fileTypeSelectedTotalCount);
            });
        });
        it('File Type selected all file can click download button, get modal with proper contents', function () {

            cy.getDownloadButton().click().end()
                .get('div.modal-dialog .modal-body button.btn-info').should('have.length', 1).should('contain', 'I have read').click().end()
                .get('div.modal-dialog .modal-body form[method="POST"] input[type="hidden"][name="accession_triples"]').should('have.length', 1).end()
                .get('div.modal-dialog .modal-header button.btn-close').click().end();

        });

        it('ExpSets checkboxes are checked & can be toggled', function () {

            cy.getDownloadButton().invoke('text').then((downloadButtonTextContent) => {
                let origSelectedCount = downloadButtonTextContent.match(/\d/g);
                origSelectedCount = parseInt(origSelectedCount.join(''));
                return cy.get('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]').each(($checkBox, idx) => {
                    if (idx >= 15) return; // Only run for first 15 expsets
                    return checkUncheckFileCheckbox(origSelectedCount, $checkBox);
                });
            });
        });

        it('ExpSets > FilePairs+Files checkboxes are checked & can be toggled.', function () {
            cy.getDownloadButton().invoke('text').then((downloadButtonTextContent) => {
                let origSelectedCount = downloadButtonTextContent.match(/\d/g);
                origSelectedCount = parseInt(origSelectedCount.join(''));
                return cy.get('.search-results-container .search-result-row .search-result-column-block button.toggle-detail-button')
                    .should('have.length.greaterThan', 24)
                    .each(($toggleDetailButton, idx) => {
                        if (idx >= 5) return; // Only run for first 5 expsets
                        return cy.wrap($toggleDetailButton).scrollToCenterElement().click({ 'force': true }).end()
                            .get('.search-results-container .search-result-row.detail-open').then(function ($resultRow) {
                                return cy.get('.search-results-container .search-result-row.detail-open .result-table-detail-container.detail-open .files-tables-container h4 i.toggle-open-icon')
                                    .each(($toggleFilesOpenButton, idx) => { // Raw Files (0), Processed Files (1)
                                        cy.wrap($toggleFilesOpenButton).scrollToCenterElement().click({ 'force': true }).end() // Open
                                            .get('.search-results-container .search-result-row.detail-open .result-table-detail-container.detail-open .files-tables-container .stacked-block-table input[type="checkbox"]')
                                            .each(function ($checkBox, checkBoxIdx) {
                                                if (checkBoxIdx >= 3) return; // Only do for first few files
                                                checkUncheckFileCheckbox(origSelectedCount, $checkBox);
                                            }).end()
                                            .wrap($toggleFilesOpenButton).scrollToCenterElement().click({ 'force': true }).end(); // Close
                                    });
                            }).end().wrap($toggleDetailButton).scrollToCenterElement().click({ 'force': true }).end();
                    });
            });
        });

        it('Can click Download button, get modal with proper contents', function () {

            cy.getDownloadButton().click().end()
                .get('div.modal-dialog .modal-body button.btn-info').should('have.length', 1).should('contain', 'I have read').click().end()
                .get('div.modal-dialog .modal-body form[method="POST"] input[type="hidden"][name="accession_triples"]').should('have.length', 1).end()
                .get('div.modal-dialog .modal-header button.btn-close').click().end();
        });

        it('"Deselect All Files" button works; checkboxes unchecked.', function () {

            cy.getSelectAllFilesButton().click().should('not.contain', "Deselect All").end()
                .getDownloadButton().should('have.attr', 'disabled')
                .getDownloadButton().invoke('text').then((downloadButtonTextContent) => {
                    let foundNum = downloadButtonTextContent.match(/\d/g);
                    foundNum = parseInt(foundNum.join(''));
                    expect(foundNum).to.equal(0);
                }).end()
                .get('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]').should('not.be.checked');

        });

        it("Sort multiple columns via column sorter; check result's column headers", function () {
            //Open multi-column sorter
            cy.get('#content div.above-results-table-row div.right-buttons button.btn[data-tip="Sort multiple columns"]').click().end()
                //Remove existing sort column
                .get('.btn.btn-outline-secondary.btn-sm[data-tip="Remove sort column"]').click().end()
                //Sort column 1 (asc)
                .get('.multi-column-sort .dropdown-toggle').contains('Select a column to sort').click({ 'force': true }).end()
                .get('.show.dropdown').contains('Title').click({ 'force': true }).end()
                //Sort column 2 (desc)
                .get('.multi-column-sort .dropdown-toggle').contains('Select a column to sort').click({ 'force': true }).end()
                .get('.show.dropdown').contains('Dataset').click({ 'force': true }).end()
                .get('.multi-column-sort .dropdown-toggle').eq(3).contains('Ascending').click({ 'force': true }).end()
                .get('.show.dropdown').contains('Descending').click({ 'force': true }).end()
                //Sort column 3 (asc)
                .get('.multi-column-sort .dropdown-toggle').contains('Select a column to sort').click({ 'force': true }).end()
                .get('.show.dropdown').contains('Condition').click({ 'force': true }).end()
                //Click sorting
                .get('.btn.btn-primary.btn-sm[data-tip="Re-sort columns"]').click().end()
                .get('.headers-columns-overflow-container [data-field="display_title"] .active.column-sort-icon').then(function ($item) {
                    cy.expect(1).equal(parseInt($item.text()));
                    cy.expect(1).equal($item.children('i.icon-sort-up').length);
                })
                .get('.headers-columns-overflow-container [data-field="dataset_label"] .active.column-sort-icon').then(function ($item) {
                    cy.expect(2).equal(parseInt($item.text()));
                    cy.expect(1).equal($item.children('i.icon-sort-down').length);
                })
                .get('.headers-columns-overflow-container [data-field="condition"] .active.column-sort-icon').then(function ($item) {
                    cy.expect(3).equal(parseInt($item.text()));
                    cy.expect(1).equal($item.children('i.icon-sort-up').length);
                });
        });

    });

});
