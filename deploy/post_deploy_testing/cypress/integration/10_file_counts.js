
describe('Experiments - Total Count', function () {

    context('Ensure files total count.', function () {


        it('Visit experiment page and total count match', function () {

            cy.visit('/experiments-mic/4DNEXCET3RFY/').wait(100).end();

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
                                        else if (tabKey === 'supplementary-files') {
                                            return cy.get('.rc-tabs-tabpane.rc-tabs-tabpane-active .reference-files-section.supplementary-files-section-part .stacked-block-table-outer-container .stacked-block-table.mounted.fade-in.expset-processed-files .headers.stacked-block-table-headers .heading-block.col-file.has-checkbox .file-header-select-checkbox').first().click({ 'force': true }).end().wait(1000)
                                                .get('.rc-tabs-content .rc-tabs-tabpane-active')
                                                .get(".rc-tabs-tabpane.rc-tabs-tabpane-active  .count-to-download-integer").first().then(function ($downloadCountFile) {
                                                    downloadFileCount = $downloadCountFile.text();
                                                }).get(".processed-files-table-section h3.tab-section-title .small").first().invoke('text').then(function ($tabFileCount) {
                                                    const fileCount = $tabFileCount.split(' ')[2]
                                                    tabFileCount = fileCount; cy.expect(downloadFileCount).equal(tabFileCount);
                                                }).end();
                                        }

                                    }).end();
                            }).end();
                        }
                    }).end();
            }).end();

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
