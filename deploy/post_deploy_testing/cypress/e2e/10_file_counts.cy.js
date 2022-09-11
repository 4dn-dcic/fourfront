import _ from 'underscore';

describe('Processed/Raw/Supplementary Files - Counts', function () {

    context('Visit random(ish) experiment sets and experiments containing processed/raw/supplementary files', function () {

        it('Visit experiment set pages and compare file counts on tab header, title and download button (Firstly, ensure that all selected)', function () {

            cy.visit('/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&experiments_in_set.files.accession!=No+value&experiments_in_set.processed_files.accession!=No+value&other_processed_files.files.accession!=No+value&other_processed_files.files.status=released').end()
                .login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken': true }).wait(500);

            cy.getQuickInfoBarCounts().its('experiment_sets').then((expSetCount) => {
                const countRecentItemsToVisit = expSetCount >= 15 ? 5 : Math.min(1, parseInt(expSetCount / 3));

                Cypress._.forEach(Cypress._.range(0, countRecentItemsToVisit), function (idx) {

                    context('Experiment Set Replicate - #' + (idx + 1) + '/' + countRecentItemsToVisit, function () {

                        cy.scrollToBottom().then(() => {
                            cy.get('.search-results-container .search-result-row[data-row-number="' + (3 * idx) + '"] .search-result-column-block[data-field="display_title"] a').click({ force: true }).wait(500).end();
                        }).end();

                        cy.window().then(function (w) {
                            let currPagePath = "/";
                            cy.location('pathname').should('not.equal', currPagePath)
                                .then(function (pathName) {
                                    currPagePath = pathName;
                                }).wait(3000).end()
                                .get('h1.page-title').should('not.be.empty').end()
                                .get('div.rc-tabs span[data-tab-key="raw-files"]').should('contain', 'Raw Files')
                                .get('div.rc-tabs span[data-tab-key="processed-files"]').should('contain', 'Processed Files')
                                .get('div.rc-tabs span[data-tab-key="supplementary-files"]').should('contain', 'Supplementary Files').end();

                            // let currTabTitle = null;
                            // cy.get("h3.tab-section-title, h4.tab-section-title").first().then(function ($tabTitle) {
                            //     currTabTitle = $tabTitle.text();
                            // }).end();

                            cy.get('.rc-tabs .rc-tabs-nav div.rc-tabs-tab:not(.rc-tabs-tab-active):not(.rc-tabs-tab-disabled)').each(function ($tab) {
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
                                                tabKeyFileCount = $tabKeyTitle.text().trim().split(' ');
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
                                                tabKeyFileCount = $tabKeyTitle.text().trim().split(' ');
                                                cy.expect(downloadFileCount).equal(tabKeyFileCount[0]);
                                            }).end();
                                    }

                                }).end();
                                cy.wrap($tab).click({ 'force': true }).end()
                                    .wait(200)
                                    .get('.rc-tabs-content .rc-tabs-tabpane-active');
                            }).end();
                        }).end();

                        cy.go('back').wait(100).end();
                    });
                });
            });
        });

        it('Visit experiment pages and compare file counts on tab header, title and download button (Firstly, ensure that all selected)', function () {

            cy.visit('/search/?type=Experiment&files.accession!=No+value&processed_files.accession!=No+value&other_processed_files.files.accession!=No+value&other_processed_files.files.status=released').wait(500).end()
                .login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken': true }).wait(500);

            cy.searchPageTotalResultCount().then((totalCountExpected) => {
                const countRecentItemsToVisit = totalCountExpected >= 15 ? 5 : Math.min(1, parseInt(totalCountExpected / 3));

                Cypress._.forEach(Cypress._.range(0, countRecentItemsToVisit), function (idx) {

                    context('Experiment - #' + (idx + 1) + '/' + countRecentItemsToVisit, function () {

                        cy.scrollToBottom().then(() => {
                            cy.get('.search-results-container .search-result-row[data-row-number="' + (3 * idx) + '"] .search-result-column-block[data-field="display_title"] a').click({ force: true }).wait(200).end();
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
                                                        tabKeyFileCount = $tabKeyTitle.text().trim().split(' ');
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
                                                    }).end()
                                                    .get(".rc-tabs-tab-active .tab").first().then(function ($tabKeyTitle) {
                                                        tabKeyFileCount = $tabKeyTitle.text().trim().split(' ');
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
                                            .end();

                                    }).end();
                                }).end();
                        }).end();

                        cy.go('back').wait(100).end();
                    });
                });
            });
        });

        it('Search files having HiGlass display as static content, then check the HiGlass icon is visible in associated ExpSet file tables', function () {

            cy.visit('/search/?type=File&static_content.location=tab:higlass&source_experiments!=No+value').end()
                .login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken': true }).wait(500);

            cy.searchPageTotalResultCount().then((totalCountExpected) => {
                const countRecentItemsToVisit = totalCountExpected >= 15 ? 5 : Math.min(1, parseInt(totalCountExpected / 3));

                Cypress._.forEach(Cypress._.range(0, countRecentItemsToVisit), function (idx) {

                    context('File - #' + (idx + 1) + '/' + countRecentItemsToVisit, function () {

                        cy.scrollToBottom().then(() => {
                            cy.get('.search-results-container .search-result-row[data-row-number="' + (3 * idx) + '"] .search-result-column-block[data-field="display_title"] a').click({ force: true }).wait(500).end();
                        }).end().wait(200);

                        let accession = null;
                        cy.get('.clickable.copy-wrapper.accession.inline-block[data-tip="Accession: A unique identifier to be used to reference the object."]').then(function ($accesionText) {
                            accession = $accesionText.text();
                        });

                        cy.get('.files-tables-container .processed-files-table-section').click({ force: 'true' }).end();
                        cy.get('.name-title.d-inline-block .title-of-file.text-monospace').then(function ($higlassAccesions) {
                            expect(Cypress._.find($higlassAccesions, function (item) {
                                return item.outerText.trim() === accession.trim();
                            })).not.to.equal(undefined);
                        });

                        cy.get('.btn.btn-xs.btn-primary.in-stacked-table-button[data-tip="Visualize with HiGlass"]').then(function ($higlassIcon) {
                            expect($higlassIcon.length).to.be.greaterThan(0);
                        });

                        cy.go('back').wait(100).end();
                    });
                });
            });

        });

        it('Visit experiment set pages, check Warning tab is visible when a biosample in set has a warning badge', function () {

            cy.visit('/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&experiments_in_set.biosample.badges.badge.badge_classification=Warning&status=released').end()
                .login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken': true }).wait(500);

            cy.getQuickInfoBarCounts().its('experiment_sets').then((expSetCount) => {
                const countRecentItemsToVisit = expSetCount >= 15 ? 3 : Math.min(1, parseInt(expSetCount / 3));

                Cypress._.forEach(Cypress._.range(0, countRecentItemsToVisit), function (idx) {

                    context('Experiment Set Replicate - #' + (idx + 1) + '/' + countRecentItemsToVisit, function () {

                        cy.scrollToBottom().then(() => {
                            cy.get('.search-results-container .search-result-row[data-row-number="' + (3 * idx) + '"] .search-result-column-block[data-field="display_title"] a').click({ force: true }).wait(500).end();
                        }).end();

                        let biosampleAccesionName;
                        let badgeItemCount = 0;
                        cy.window().then(function (w) {
                            let currPagePath = "/";
                            cy.location('pathname').should('not.equal', currPagePath)
                                .then(function (pathName) {
                                    currPagePath = pathName;
                                    console.log(currPagePath);
                                }).wait(3000).end()
                                .get('h1.page-title').should('not.be.empty').end()
                                .get('div.rc-tabs span[data-tab-key="badges"]').click({ 'force': true }).end()
                                .wait(200)
                                .get('.badge-classification-group .badge-item').then(function ($badgeItems) {
                                    badgeItemCount = $badgeItems.length;
                                })
                                .get('div.rc-tabs span[data-tab-key="badges"]').should('contain', badgeItemCount > 1 ? 'Warnings' : 'Warning')
                                .get('.badge-classification-group .badge-item .inner.mb-05 .mt-02 .text-600').first().then(function ($biosampleAccesionName) {
                                    biosampleAccesionName = $biosampleAccesionName.text().trim();
                                })
                                .get('.badge-classification-group .badge-item .inner.mb-05 .mt-02 a').first().click({ 'force': true }).end().wait(300)
                                .get('.item-label-title .accession.inline-block').then(function ($selectedAccesionName) {
                                    const selectedAccesionName = $selectedAccesionName.text().trim();
                                    expect(biosampleAccesionName).to.contain(selectedAccesionName);
                                });
                        }).end();

                        cy.go(-2).wait(100).end();
                    });
                });
            });
        });

        it('Visit quality metric tables and check columns whether they are valid and in proper order as it is in Quality Metric Item page', function () {

            cy.visit('browse/?type=ExperimentSetReplicate&experimentset_type=replicate&experiments_in_set.files.quality_metric.display_title!=No+value').end()
                .login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken': true }).wait(500);

            cy.getQuickInfoBarCounts().its('experiment_sets').then((expSetCount) => {
                const countRecentItemsToVisit = expSetCount >= 15 ? 3 : Math.min(1, parseInt(expSetCount / 3));

                Cypress._.forEach(Cypress._.range(0, countRecentItemsToVisit), function (idx) {

                    context('Experiment Set Replicate - #' + (idx + 1) + '/' + countRecentItemsToVisit, function () {

                        cy.scrollToBottom().then(() => {
                            cy.get('.search-results-container .search-result-row[data-row-number="' + (3 * idx) + '"] .search-result-column-block[data-field="display_title"] a').click({ force: true }).wait(500).end();
                        }).end();

                        //get column headers
                        const columnNames = [];
                        cy.get(".exp-table-container.col-12 .stacked-block-table-outer-container.overflow-auto .stacked-block-table.mounted.fade-in.expset-processed-files .headers.stacked-block-table-headers").each(function ($el, headerIdx) {
                            if (headerIdx === 0) {
                                const children = $el.children('.heading-block.col-file-detail');
                                _.each(children, function (item) {
                                    if (item.innerText !== 'Details') {
                                        columnNames.push(item.innerText);
                                    }
                                });
                            }
                        });

                        //get column values
                        const columnValues = [];
                        cy.get('.exp-table-container.col-12 .s-block-list.expset-processed-files.stack-depth-0 .s-block-list.files.stack-depth-1 .s-block.file.stack-depth-2').each(function ($el, rowIdx) {
                            if (rowIdx === 0) {
                                const children = $el.children('.col-file-detail');
                                _.each(children, function (item, colIdx) {
                                    if (item.innerText !== '') {
                                        columnValues.push(item.innerText);
                                    }
                                    if (colIdx === columnNames.length) {
                                        const href = item.lastChild['href'];
                                        return cy.visit(href);
                                    }
                                });
                            }
                        });

                        //qc metric name
                        cy.get('.overview-list-elements-container .overview-list-element .col-4.text-right .mt-02').each(function ($el, idx) {
                            cy.get($el[0]).should('contain', columnNames[idx]);
                        });

                        //qc metric value
                        cy.get('.overview-list-elements-container .overview-list-element .col-8 .value').each(function ($el, idx) {
                            if (idx < columnValues.length) {
                                cy.get($el[0]).should('contain', columnValues[idx]);
                            }
                        });

                    });
                    cy.go(-2).wait(100).end();

                });

            });

        });
    });
});