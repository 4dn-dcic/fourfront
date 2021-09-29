
describe('Experiments - Total Count', function () {

    context('Ensure files total count.', function () {

        it('Visit experiment set page and total count match', function () {
        
            for (let interval = 0; interval < 5; interval++) {
                
                cy.visit('/search/?type=ExperimentSet&experiments_in_set.files.accession%21=No+value&experiments_in_set.processed_files.accession%21=No+value&other_processed_files.files.accession%21=No+value').end()
                .login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken' : true }).end();

                cy.scrollToBottom().then(() => {
                    cy.get('.search-results-container .search-result-row[data-row-number="' + (3 * (interval + 1)) + '"] .search-result-column-block[data-field="display_title"] a').click({ force: true }).wait(500).end();
                }).end();
                cy.window().then(function (w) {
                    let currPagePath = "/";
                    cy.location('pathname').should('not.equal', currPagePath)
                        .then(function (pathName) {
                            currPagePath = pathName;
                            console.log(currPagePath);
                        }).wait(3000).end()
                        .get('h1.page-title').should('not.be.empty').end()
                        .get('div.rc-tabs span[data-tab-key="raw-files"]').should('contain', 'Raw Files')
                        .get('div.rc-tabs span[data-tab-key="processed-files"]').should('contain', 'Processed Files')
                        .get('div.rc-tabs span[data-tab-key="supplementary-files"]').should('contain', 'Supplementary Files').end();

                    let currTabTitle = null;
                    cy.get("h3.tab-section-title, h4.tab-section-title").first().then(function ($tabTitle) {
                        currTabTitle = $tabTitle.text();
                    }).end(); cy.get('.rc-tabs .rc-tabs-nav div.rc-tabs-tab:not(.rc-tabs-tab-active):not(.rc-tabs-tab-disabled)').each(function ($tab) {
                        cy.get('h1.page-title').should('not.be.empty').end().get('.rc-tabs-nav-scroll .rc-tabs-nav.rc-tabs-nav-animated .rc-tabs-tab-active.rc-tabs-tab').each(function ($tab) {
                            const tabKey = $tab.children('span.tab').attr('data-tab-key');
                            let tabFileCount = null;
                            let downloadFileCount = null;
                            let tabKeyFileCount = null;

                            if (tabKey === 'raw-files') {
                                return cy.wrap($tab).click({ 'force': true }).end()
                                    .wait(200)
                                    .get('.rc-tabs-content .rc-tabs-tabpane-active')
                                    .get(".rc-tabs-tabpane.rc-tabs-tabpane-active  .count-to-download-integer").first().then(function ($downloadCountFile) {
                                        downloadFileCount = $downloadCountFile.text();
                                    }).get(".rc-tabs-tabpane.rc-tabs-tabpane-active .overflow-hidden h3.tab-section-title .text-400").first().then(function ($tabFileCount) {
                                        tabFileCount = $tabFileCount.text(); cy.expect(downloadFileCount).equal(tabFileCount);
                                    }).end().get(".rc-tabs-tab-active .tab").first().then(function ($tabKeyTitle) {
                                        tabKeyFileCount= $tabKeyTitle.text().trim().split (' ');
                                        cy.expect(downloadFileCount).equal(tabKeyFileCount[0]);
                                    }).end();
                            }
                            else if (tabKey === 'processed-files') {
                                return cy.wrap($tab).click({ 'force': true }).end()
                                .wait(200)
                                .get('.rc-tabs-content .rc-tabs-tabpane-active')
                                .get(".rc-tabs-tabpane.rc-tabs-tabpane-active  .count-to-download-integer").first().then(function ($downloadCountFile) {
                                    downloadFileCount = $downloadCountFile.text();
                                }).get('.processed-files-table-section.exp-table-section h3.tab-section-title .text-400').first().then(function ($tabFileCount) {
                                    tabFileCount = $tabFileCount.text(); cy.expect(downloadFileCount).equal(tabFileCount);
                                }).end().get(".rc-tabs-tab-active .tab").first().then(function ($tabKeyTitle) {
                                    tabKeyFileCount= $tabKeyTitle.text().trim().split (' ');
                                    cy.expect(downloadFileCount).equal(tabKeyFileCount[0]);
                                }).end();
                            }

                        }).end();
                        cy.wrap($tab).click({ 'force': true }).end()
                            .wait(200)
                            .get('.rc-tabs-content .rc-tabs-tabpane-active')
                            
                    }).end();
                }).end();
            }

        });

        it('Visit experiment page and total count match', function () {

            for (let interval = 0; interval < 5; interval++) {
                cy.visit('/search/?type=Experiment&files.accession!=No+value&processed_files.accession!=No+value&other_processed_files.files.accession%21=No+value').wait(500).end()
                .login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken' : true }).wait(500);

                cy.scrollToBottom().then(() => {
                    cy.get('.search-results-container .search-result-row[data-row-number="' + (3 * (interval + 1)) + '"] .search-result-column-block[data-field="display_title"] a').click({ force: true }).wait(200).end();
                }).end();
                cy.window().then(function (w) {
                    let currPagePath = "/";
                    cy.location('pathname').should('not.equal', currPagePath)
                        .then(function (pathName) {
                            currPagePath = pathName;
                            console.log(currPagePath);
                        }).wait(3000).end()
                        .get('h1.page-title').should('not.be.empty').end()
                        .get('div.rc-tabs span[data-tab-key="raw-files"]').should('contain', 'Raw File')
                        .get('div.rc-tabs span[data-tab-key="processed-files"]').should('contain', 'Processed File')
                        .get('div.rc-tabs span[data-tab-key="supplementary-files"]').should('contain', 'Supplementary File').end()
                        .get('div.rc-tabs div.rc-tabs-tab[role="tab"]').then(($tabList) => {
                            let currTabTitle = null;
                            cy.get("h3.tab-section-title, h4.tab-section-title").first().then(function ($tabTitle) {
                                currTabTitle = $tabTitle.text();
                            }).end(); cy.get('.rc-tabs .rc-tabs-nav div.rc-tabs-tab:not(.rc-tabs-tab-active):not(.rc-tabs-tab-disabled)').each(function ($tab) {
                                const tabKey = $tab.children('span.tab').attr('data-tab-key');
                                cy.get('h1.page-title').should('not.be.empty').end().get('.rc-tabs-nav-scroll .rc-tabs-nav.rc-tabs-nav-animated .rc-tabs-tab-active.rc-tabs-tab').each(function ($tab) {
                                    const tabKey = $tab.children('span.tab').attr('data-tab-key');
                                    let tabFileCount = null;
                                    let downloadFileCount = null;
                                    let tabKeyFileCount = null;
                                    if (tabKey === 'raw-files') {
                                        return cy.wrap($tab).click({ 'force': true }).end()
                                            .wait(200)
                                            .get('.rc-tabs-content .rc-tabs-tabpane-active')
                                            .get(".rc-tabs-tabpane.rc-tabs-tabpane-active  .count-to-download-integer").first().then(function ($downloadCountFile) {
                                                downloadFileCount = $downloadCountFile.text();
                                            }).get(".rc-tabs-tabpane.rc-tabs-tabpane-active .overflow-hidden h3.tab-section-title .text-400").first().then(function ($tabFileCount) {
                                                tabFileCount = $tabFileCount.text(); cy.expect(downloadFileCount).equal(tabFileCount);
                                            }).end()
                                            .get(".rc-tabs-tab-active .tab").first().then(function ($tabKeyTitle) {
                                                tabKeyFileCount= $tabKeyTitle.text().trim().split (' ');
                                                cy.expect(downloadFileCount).equal(tabKeyFileCount[0]);
                                            }).end();
                                    }
                                    else if(tabKey === 'processed-files') {
                                        return cy.wrap($tab).click({ 'force': true }).end()
                                        .wait(200)
                                        .get('.rc-tabs-content .rc-tabs-tabpane-active')
                                        .get(".rc-tabs-tabpane.rc-tabs-tabpane-active  .count-to-download-integer").first().then(function ($downloadCountFile) {
                                            downloadFileCount = $downloadCountFile.text();
                                        }).get('.processed-files-table-section.exp-table-section h3.tab-section-title .text-400').first().then(function ($tabFileCount) {
                                            tabFileCount = $tabFileCount.text(); cy.expect(downloadFileCount).equal(tabFileCount);
                                        }).end()
                                        .get(".rc-tabs-tab-active .tab").first().then(function ($tabKeyTitle) {
                                            tabKeyFileCount= $tabKeyTitle.text().trim().split (' ');
                                            cy.expect(downloadFileCount).equal(tabKeyFileCount[0]);
                                        }).end();
                                    }

                                }).end();
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

                            }).end();
                        }).end();
                }).end();

            }
        });

    });

});
