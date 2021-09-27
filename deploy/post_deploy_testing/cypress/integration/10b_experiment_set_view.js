
describe('Experiment Set Views - Files Selection', function () {

    context('Ensure "Select All Files" & related features are functional.', function () {

        before(function () {
            cy.visit('/search/?type=ExperimentSet&experiments_in_set.files.accession%21=No+value&experiments_in_set.processed_files.accession%21=No+value&other_processed_files.files.accession%21=No+value');

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

        it('Visit experiment set page and total count match', function () {

            cy.visit('/experiment-set-replicates/4DNES265ETYQ/').wait(100).end();

            cy.window().then(function (w) {
                let currPagePath = "/";
                cy.location('pathname').should('not.equal', currPagePath)
                    .then(function (pathName) {
                        currPagePath = pathName;
                        console.log(currPagePath);
                    }).wait(3000).end()
                    .get('h1.page-title').should('not.be.empty').end()
                    .get('div.rc-tabs span[data-tab-key="raw-files"]').should('contain', 'Raw Files').end()
                    .get('div.rc-tabs div.rc-tabs-tab[role="tab"]').then(($tabList) => {
                        const nonDisabledTabs = $tabList.filter(":not(.rc-tabs-tab-disabled)");
                        const nonDisabledTabsLen = nonDisabledTabs.length;
                        expect(nonDisabledTabsLen).to.be.greaterThan(0); // We might have only 1 single 'Raw Files' tab or similar, but it shouldn't be disabled if so.
                        if (nonDisabledTabsLen < 2) {
                            // Not multiple (clickable) tabs - skip clicking them.
                            cy.root().should('not.contain', "client-side error").end();
                        } else {
                            let currTabTitle = null;
                            cy.get("h3.tab-section-title, h4.tab-section-title").first().then(function ($tabTitle) {
                                currTabTitle = $tabTitle.text();
                            }).end(); cy.get('.rc-tabs .rc-tabs-nav div.rc-tabs-tab:not(.rc-tabs-tab-active):not(.rc-tabs-tab-disabled)').each(function ($tab) {
                                const tabKey = $tab.children('span.tab').attr('data-tab-key');
                                cy.wrap($tab).click({ 'force': true }).end()
                                    .wait(200)
                                    .get('.rc-tabs-content .rc-tabs-tabpane-active')
                                    .should('have.id', "tab:" + tabKey).within(function ($tabPanel) {
                                        cy.get("h3.tab-section-title, h4.tab-section-title").first().then(function ($tabTitle) {
                                            const nextTabTitle = $tabTitle.text();
                                            expect(nextTabTitle).to.not.equal(currTabTitle);
                                            currTabTitle = nextTabTitle;
                                        });
                                    }).end()
                                    .root().should('not.contain', "client-side error")
                                    .end()
                                    .get('h1.page-title').should('not.be.empty').end().get('.rc-tabs-nav-scroll .rc-tabs-nav.rc-tabs-nav-animated .rc-tabs-tab-active.rc-tabs-tab').each(function ($tab) {
                                        const tabKey = $tab.children('span.tab').attr('data-tab-key');
                                        let tabFileCount = null;
                                        let downloadFileCount = null;
                                        if ((tabKey === 'raw-files') || (tabKey === 'processed-files')) {
                                            return cy.wrap($tab).click({ 'force': true }).end()
                                                .wait(200)
                                                .get('.rc-tabs-content .rc-tabs-tabpane-active')
                                                .get(".rc-tabs-tabpane.rc-tabs-tabpane-active  .count-to-download-integer").first().then(function ($downloadCountFile) {
                                                    downloadFileCount = $downloadCountFile.text();
                                                }).get(tabKey === 'processed-files' ? '.processed-files-table-section.exp-table-section h3.tab-section-title .text-400' : ".rc-tabs-tabpane.rc-tabs-tabpane-active .overflow-hidden h3.tab-section-title .text-400").first().then(function ($tabFileCount) {
                                                    tabFileCount = $tabFileCount.text(); cy.expect(downloadFileCount).equal(tabFileCount);
                                                }).end();

                                        }
                                        // else if (tabKey === 'supplementary-files') {
                                        //     return cy.get('.rc-tabs-tabpane.rc-tabs-tabpane-active .reference-files-section.supplementary-files-section-part .stacked-block-table-outer-container .stacked-block-table.mounted.fade-in.expset-processed-files .headers.stacked-block-table-headers .heading-block.col-file.has-checkbox .file-header-select-checkbox').first().click({ 'force': true }).end().wait(1000)
                                        //         .get('.rc-tabs-content .rc-tabs-tabpane-active')
                                        //         .get(".rc-tabs-tabpane.rc-tabs-tabpane-active .processed-files-table-section .count-to-download-integer").first().then(function ($downloadCountFile) {
                                        //             downloadFileCount = $downloadCountFile.text();
                                        //         }).get(".processed-files-table-section h3.tab-section-title .small").first().invoke('text').then(function ($tabFileCount) {
                                        //             const fileCount = $tabFileCount.split(' ')[2]
                                        //             tabFileCount = fileCount; cy.expect(downloadFileCount).equal(tabFileCount);
                                        //         }).end();
                                        // }

                                    }).end();
                            }).end();
                        }
                    }).end();
            }).end();

        });
    });

});
