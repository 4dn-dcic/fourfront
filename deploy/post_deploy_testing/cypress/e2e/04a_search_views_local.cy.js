import _ from 'underscore';


describe('Deployment/CI Search View Tests', function () {

    var testItemsToDelete = [];

    function addAtIdToDeletedItems() {
        cy.get('script[data-prop-name=context]').then(function ($context) {
            const context = $context.text();
            const contextData = JSON.parse(context);
            const atId = contextData['@id'];
            cy.log('DELETING atId', atId);
            if (atId !== '/search/?type=MicroscopeConfiguration') {
                testItemsToDelete.push(atId);
            }
        });
    }

    context('/search/?type=Item', function () {

        before(function(){ // beforeAll
            cy.visit('/search/');
        });

        it('Has at least 100 results for /search/?type=Item', function () {
            cy.location('search').should('include', 'type=Item').end()
                .get('.search-results-container .search-result-row').then(($searchResultElems)=>{
                    expect($searchResultElems.length).to.equal(25);
                }).end()
                .searchPageTotalResultCount().should('be.greaterThan', 100);
        });

    });

    context('/search/?type=Page', function(){

        before(function(){ // beforeAll
            cy.visit('/pages'); // We should get redirected to ?type=Page
        });

        beforeEach(function () {
            // Ensure we preserve search session cookie for proper ordering.
            cy.session('preserveCookies', () => {
                // Ensure we preserve search session cookie for proper ordering.
                cy.getCookie('searchSessionID').then((cookie) => {
                    if (cookie) {
                        cy.setCookie('searchSessionID', cookie.value);
                    }
                });
            });
        });

        it('Should redirect to /search/?type=Page correctly', function(){
            cy.location('search').should('include', 'type=Page').end()
                .location('pathname').should('include', '/search/');
        });

        it('Should have at least 20 results.', function(){
            cy.get('.search-results-container .search-result-row').then(($searchResultElems)=>{
                expect($searchResultElems.length).to.be.greaterThan(20);
            });
        });

    });

    context('Publications, Files', function(){
        // These are similarly implemently to the BrowseView, we should have specific tests for these

        it('/publications/ should redirect to /search/?type=Publication', function(){
            cy.visit('/publications/').location('search').should('include', 'type=Publication').end()
                .location('pathname').should('include', '/search/');
        });

        it('Should have at least 3 Publications.', function(){
            cy.get('.search-results-container .search-result-row').then(($searchResultElems)=>{
                expect($searchResultElems.length).to.be.greaterThan(2);
            });
            cy.get('.search-results-container .search-result-row .toggle-detail-button-container').then(($searchResultToggleBtnElems)=>{
                expect($searchResultToggleBtnElems.length).to.be.greaterThan(2);
            });
        });

        it('/files/ should redirect to /search/?type=File', function(){
            cy.visit('/files/').location('search').should('include', 'type=File').end()
                .location('pathname').should('include', '/search/');
        });

        it('Should have at least 20 File row selection checkboxes', function(){
            cy.get('.search-results-container .search-result-row').then(($searchResultElems)=>{
                expect($searchResultElems.length).to.be.greaterThan(20);
            });
            cy.get('.search-results-container .search-result-row .checkbox-with-label.expset-checkbox input').then(($checkboxes)=>{
                expect($checkboxes.length).to.be.greaterThan(20);
            });
        });

        it('Should have columns for file type, format', function(){
            cy.get('.headers-columns-overflow-container .columns .search-headers-column-block[data-field="file_type"]').contains("File Type");
            cy.get('.headers-columns-overflow-container .columns .search-headers-column-block[data-field="file_format.file_format"]').contains("File Format");
        });
    });

    context('Microscope Configurations Collections', function(){

        let microscopeDescription;
        const standType = "Inverted";

        it('Can add new tier-1 microscope configuration', function(){

            cy.login4DN({ 'email' : 'ud4dntest@gmail.com', 'useEnvToken' : false }).end()
                .visit('/search/?type=MicroscopeConfiguration').end()
                .get('.search-results-container .search-result-row').then(($searchResultElems)=>{
                    expect($searchResultElems.length).to.be.greaterThan(0);
                }).end()
                .get('.above-results-table-row .results-count.box button.btn-xs').contains("Create New").click().end()
                .get('a.dropdown-item').contains('Tier 1').click().end();

            // set microscope conf. name
            const identifier = ("mc-test-" + new Date().getTime());
            cy.get('.modal-dialog input#microscope_name.form-control').focus().type(identifier, { delay: 0 }).end();

            // set microscope conf. description
            microscopeDescription = "tier-1 microscope conf. description";
            cy.get('.modal-dialog input#microscope_description.form-control').focus().type(microscopeDescription, { delay: 0 }).end();

            // set microscope conf. stand type
            cy.get('button#validation_tier.dropdown-toggle.btn.btn-primary').contains('Select Stand Type').click().end()
                .get('a.dropdown-item').contains(standType).click().end();

            // submit new microscope conf. creation
            cy.get('button.btn.btn-success').contains('Submit').click().end()
                .get('#page-title-container div.mb-0').should('contain', 'Created new microscope configuration.').end();

            // get response and store atId (to delete item at the end of test)
            addAtIdToDeletedItems();
        });

        it('Verify created microscope configuration\'s tier number and stand matches', function (){
            //Click edit buttton
            cy.get('div.micro-meta-app-container #microscopy-app-container .btn.btn-primary.btn-lg').should('contain', 'Edit microscope').first().click().end();

            //Verify tier is 1
            cy.get('div.form-group div.mb-0.form-group input#rjsfPrefix_Tier').should('have.value', '1');

            //Verify stand
            cy.get('li#react-tabs-2').contains(standType + 'MicroscopeStand');

            //Edit popup cancel
            cy.get('div.form-group div.mb-0.form-group input#rjsfPrefix_Description').should('have.value', microscopeDescription)
                .get('div#microscopy-app-overlays-container div div div div button.btn.btn.btn-primary.btn-lg').contains('Cancel').click().end();
        });

        it('Can save as microscope configuration', function () {
            cy.login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken': true }).end();

            //Clone microscope data
            cy.get("div.dropup button#dropdown-basic-button.dropdown-toggle.btn.btn-dark.btn-lg div").contains('Save').click().end()
                //Clone success save message
                // eslint-disable-next-line no-useless-escape
                .get("a#Save\\ as\\ new\\ microscope.dropdown-item").click().end()
                .get('h4.alert-heading.mt-0.mb-05').should('contain.text', "'s copy").end();

            // get response and store atId (to delete item at the end of test)
            addAtIdToDeletedItems();
        });

        it('Contains App and Model version in "About" popup ', function(){
            cy.login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken': true }).end();

            //Click info buttton
            cy.get('div.micro-meta-app-container #microscopy-app-container button.btn.btn-primary.btn-lg img[alt*="about-solid.svg"]').first().click().end();

            const appModelRegEx = /App version: (?<app>\S*)Model version: (?<model>\S*)\(c\)/;
            //Verify app version
            cy.get('div#microscopy-app-overlays-container p')
                .invoke('text')
                .should('match', appModelRegEx)
                // extract the app and model version
                .invoke('match', appModelRegEx)
                // grab the named group - app
                .its('groups.app')
                // and confirm its value
                .should('have.length.least', 3);

            //verify model version
            cy.get('div#microscopy-app-overlays-container p')
                .invoke('text')
                .should('match', appModelRegEx)
                // extract the app and model version
                .invoke('match', appModelRegEx)
                // grab the named group - model
                .its('groups.model')
                // and confirm its value
                .should('have.length.least', 3);
        });

        it('Delete microscope configuration', function () {

            // Log in _as admin_.
            cy.login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken': true }).end();

            cy.log('testItemsToDelete:', JSON.stringify(testItemsToDelete));
            // Delete microscope configuration
            cy.wrap(testItemsToDelete).each(function (testItemURL) { // Synchronously process async stuff.
                console.log('DELETING', testItemURL);
                cy.getCookie('jwtToken')
                    .then((cookie) => {
                        const token = cookie.value;
                        cy.request({
                            method: "PATCH",
                            url: testItemURL,
                            headers: {
                                'Authorization': 'Bearer ' + token,
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            body: JSON.stringify({ "tags": ["deleted_by_cypress_test"] })
                        });
                    });
            });

            // Empty the array now that we're done.
            testItemsToDelete = [];
        });

        it('Check microscope configuration\'s hardware summary table', function () {
            cy.visit('/search/?type=MicroscopeConfiguration&status=released').end();

            cy.get('.search-results-container .search-result-row[data-row-number="0"] .search-result-column-block[data-field="display_title"] a').click({ force: true }).end();

            cy.window().then(function (w) {
                let currPagePath = "/";
                cy.location('pathname').should('not.equal', currPagePath)
                    .then(function (pathName) {
                        currPagePath = pathName;
                        console.log(currPagePath);
                    }).end()
                    .get('h1.page-title').should('not.be.empty').end()
                    .get('div#microscopy-app-container .droptarget p').contains('Microscope Name').end()
                    .get('div.rc-tabs span[data-tab-key="hardware-summary"]').should('contain', 'Hardware Summary').end();

                cy.get('h1.page-title').should('not.be.empty').end().get('.rc-tabs-nav-scroll .rc-tabs-nav.rc-tabs-nav-animated .rc-tabs-tab span.tab[data-tab-key="hardware-summary"]:first-child').then(function ($tab) {
                    let termCount = null;
                    let termName = null;
                    let facetTotalCount = null;
                    const nextButtonItems = [];
                    const backButtonItems = [];
                    //get parent to click
                    cy.wrap($tab).parent().should('have.class', 'rc-tabs-tab').wait(1000).click({ force: true }).end();
                    let facetItemIndex = 1;
                    cy.get(".facets-body div.facet:not([data-field=''])").then(function ($facetTotalCount) {
                        facetTotalCount = $facetTotalCount.length;
                        facetItemIndex = Math.min(1, parseInt(facetTotalCount / 3));
                    });
                    cy.get(".facets-body div.facet:not([data-field='']):nth-child(" + facetItemIndex + ") > h5").scrollToCenterElement().click({ force: true }).end()
                        .get(".facet.open .facet-list-element a.term .facet-count").first().then(function ($facetCountFile) {
                            termCount = parseInt($facetCountFile.text());
                        })
                        .get(".facet.open .facet-list-element a.term .facet-item").first().then(function ($facetTextFile) {
                            termName = $facetTextFile.text();
                        })
                        .get(".row.summary-header .col.summary-title-column.text-truncate .summary-title").first().then(function ($tabFile) {
                            const tabFile = $tabFile.text().trim();
                            var regExp = /Component Summary Table - (.*) \((\d*)\)/g;
                            const regexCheck = regExp.exec(tabFile);
                            cy.expect(termName).equal(regexCheck[1]);
                            cy.expect(parseInt(termCount)).equal(parseInt(regexCheck[2]));
                            if (termCount > 3) {
                                //Next Button
                                cy.get('.row.summary-sub-header .summary-title-column.text-truncate').then(function ($totalHeader) {
                                    Cypress._.forEach($totalHeader, function (block) {
                                        const item = (Cypress.$(block).text());
                                        if ((item.trim() !== 'MetaData') || (item !== "")) {
                                            nextButtonItems.push((Cypress.$(block).text()));
                                        }
                                    });
                                    const totalCount = (termCount - nextButtonItems.length);
                                    for (let i = 0; i <= totalCount; i++) {
                                        cy.get('.prev-next-button-container [data-tip="Show next component"]').parent().click().end();
                                        cy.get('.row.summary-sub-header .summary-title-column.text-truncate').then(function ($totalHeader) {
                                            Cypress._.forEach($totalHeader, function (block) {
                                                const item = (Cypress.$(block).text());
                                                if ((item.trim() !== 'MetaData') || (item !== "")) {
                                                    nextButtonItems.push((Cypress.$(block).text()));
                                                }
                                            });
                                            if (i == totalCount) {
                                                const itemsCount = _.uniq(nextButtonItems);
                                                cy.expect(itemsCount.length - 1).equal(termCount);
                                            }
                                        }).end();
                                    }
                                });
                                //Previous Button
                                cy.get('.row.summary-sub-header .summary-title-column.text-truncate').then(function ($totalHeader) {
                                    Cypress._.forEach($totalHeader, function (block) {
                                        const item = (Cypress.$(block).text());
                                        if ((item.trim() !== 'MetaData') || (item !== "")) {
                                            backButtonItems.push((Cypress.$(block).text()));
                                        }
                                    });
                                    const totalCount = (termCount - backButtonItems.length);
                                    for (let i = 0; i <= totalCount; i++) {
                                        cy.get('.prev-next-button-container [data-tip="Show previous component"]').parent().click().end();
                                        cy.get('.row.summary-sub-header .summary-title-column.text-truncate').then(function ($totalHeader) {
                                            Cypress._.forEach($totalHeader, function (block) {
                                                const item = (Cypress.$(block).text());
                                                if ((item.trim() !== 'MetaData') || (item !== "")) {
                                                    backButtonItems.push((Cypress.$(block).text()));
                                                }
                                            });
                                            if (i == totalCount) {
                                                const itemsCount = _.uniq(backButtonItems);
                                                cy.expect(itemsCount.length - 1).equal(termCount);
                                            }
                                        }).end();
                                    }
                                });
                            }
                            else {
                                cy.get('.row.summary-sub-header .summary-title-column.text-truncate').then(function ($totalHeader) {
                                    const headerCount = $totalHeader.length - 1;
                                    cy.expect(headerCount).equal(termCount);
                                });
                            }
                        }).end();

                }).end();
            });
        });

    });

    context('Search Box in Navigation', function(){

        before(function(){ // beforeAll
            cy.visit('/'); // Start at home page
        });

        beforeEach(function () {
            // Ensure we preserve search session cookie for proper ordering.
            cy.session('preserveCookies', () => {
                // Ensure we preserve search session cookie for proper ordering.
                cy.getCookie('searchSessionID').then((cookie) => {
                    if (cookie) {
                        cy.setCookie('searchSessionID', cookie.value);
                    }
                });
            });
        });

        it('SearchBox input works, goes to /browse/ on submit', function(){
            cy.get("a#search-menu-item").click({ force: true }).end()
                .get('form.navbar-search-form-container button#search-item-type-selector').click().end()
                .get('form.navbar-search-form-container div.dropdown-menu a[data-key="ExperimentSetReplicate"]').click().end()
                .get('form.navbar-search-form-container input[name="q"]').scrollToCenterElement().focus().type('mouse', { delay: 0 }).should('have.value', 'mouse').end()
                .get(".btn.btn-outline-light.w-100[data-id='global-search-button']").click().end()
                .get('#slow-load-container').should('not.have.class', 'visible').end()
                .get('#page-title-container .page-title').should('contain', 'Data Browser').end() // Make sure we got redirected to /browse/. We may or may not have results here depending on if on local and logged out or not.
                .location('search')
                .should('include', 'ExperimentSetReplicate')
                .should('include', 'q=mouse');
        });

        it('"General (All Item Types)" option works, takes us to search page', function(){
            cy.get("a#search-menu-item").click({ force: true }).end()
                .get('form.navbar-search-form-container button#search-item-type-selector').click().end()
                .get('form.navbar-search-form-container div.dropdown-menu a[data-key="Item"]').click().end()
                .get('form.navbar-search-form-container').submit().end()
                .get('#page-title-container .page-title').should('contain', 'Search').end()
                .location('search').should('not.include', 'award.project=4DN')
                .should('include', 'q=mouse').end()
                .searchPageTotalResultCount().should('be.greaterThan', 0);
        });

        it('Clear search works ==> more results', function () {
            cy.searchPageTotalResultCount().then((origTotalResults) => {
                cy.get('.big-dropdown-menu .form-control').focus().type('*').end()
                    .get(".btn.btn-outline-light.w-100[data-id='global-search-button']").click().end()
                    .get('#slow-load-container').should('not.have.class', 'visible').end()
                    .searchPageTotalResultCount().should('be.greaterThan', origTotalResults);
            });
        });

        it('Wildcard query string returns all results.', function(){
            cy.window().screenshot('Before text search "*"').end().searchPageTotalResultCount().then((origTotalResults)=>{
                cy.get("a#search-menu-item").click({ force: true }).end()
                    .get('.big-dropdown-menu-background .form-control').focus().clear().type('*').end()
                    .get(".btn.btn-outline-light.w-100[data-id='global-search-button']").click().end()
                    // handle url encoding
                    .location('search').should('include', '%2A').end()
                    .get('#slow-load-container').should('not.have.class', 'visible').end()
                    .searchPageTotalResultCount().should('be.greaterThan', 1).should('equal', origTotalResults).end().window().screenshot('After text search "*"').end();
            });
        });

        it('Change search type, and check SearchBox placeholder', function () {
            cy.visit('/').get("a#search-menu-item").click().then(() => {
                for (let interval = 1; interval < 7; interval++) {
                    cy.get('form.navbar-search-form-container button#search-item-type-selector').click().end();
                    cy.get('a.w-100.dropdown-item:nth-child(' + interval + ')').click().then(($dataKey) => {
                        const dataKey = $dataKey.attr("data-key");
                        switch (dataKey) {
                            case 'Item':
                                cy.get('.form-control[name="q"]').invoke('attr', 'placeholder').should('contain', "Search in All Items");
                                break;
                            case 'ByAccession':
                                cy.get('.form-control[name="q"]').invoke('attr', 'placeholder').should('contain', "Type Item's Complete Accession (e.g. 4DNXXXX ...)");
                                break;
                            case 'ExperimentSetReplicate':
                                cy.get('.form-control[name="q"]').invoke('attr', 'placeholder').should('contain', "Search in Experiment Sets");
                                break;
                            case 'Publication':
                                cy.get('.form-control[name="q"]').invoke('attr', 'placeholder').should('contain', "Search in Publications");
                                break;
                            case 'File':
                                cy.get('.form-control[name="q"]').invoke('attr', 'placeholder').should('contain', "Search in Files");
                                break;
                            case 'Biosource':
                                cy.get('.form-control[name="q"]').invoke('attr', 'placeholder').should('contain', "Search in Biosources");
                                break;
                        }

                    });
                }
            });
        });

        it('"By Accession" option works, takes us the item page', function () {
            cy.visit('/browse')
                .get(".title-block.text-truncate.text-monospace.text-small").first().then(($accesion) => {
                    const accesion = $accesion.text();
                    cy.get("a#search-menu-item").click().end()
                        .get('form.navbar-search-form-container button#search-item-type-selector').click().end()
                        .get('form.navbar-search-form-container div.dropdown-menu a[data-key="ByAccession"]').click().end()
                        .get('input[name="q"]').focus().type(accesion, { delay: 0 }).end()
                        .get(".btn.btn-outline-light.w-100[data-id='global-search-button']").click().end()
                        .get('.clickable.copy-wrapper.accession.inline-block').should('contain', accesion).end();
                });
        });

        it('"Within Results" option works for Search view', function () {
            let facetItemIndex = 1;
            let facetTotalCount = null;
            cy.visit('/search')
                .get(".facets-body div.facet:not([data-field=''])").then(function ($facetTotalCount) {
                    facetTotalCount = $facetTotalCount.length;
                    facetItemIndex = Math.min(1, parseInt(facetTotalCount / 3));
                })
                .get(".facets-body div.facet:not([data-field='']):nth-child(" + facetItemIndex + ") > h5").scrollToCenterElement().click({ force: true }).end()
                .get(".facet.open .facet-list-element a.term .facet-item").first().click({ force: true }).end()
                .get("a#search-menu-item").click({ force: true }).end()
                .get('form.navbar-search-form-container button#search-item-type-selector').click().end()
                .get('form.navbar-search-form-container div.dropdown-menu a[data-key="Within"]').click().end()
                .get('form.navbar-search-form-container input[name="q"]').focus().type('gene', { delay: 0 }).end()
                .get(".btn.btn-outline-light.w-100[data-id='global-search-button']").click().end()
                .get('#slow-load-container').should('not.have.class', 'visible').end()
                .get('#page-title-container .page-title').should('contain', 'Search').end()
                .get(".facet-list-element.selected .facet-item").then(function ($selectedFacet) {
                    expect($selectedFacet.length).to.be.greaterThan(0);
                });
        });

        it('"Within Results" option works for Browse view', function () {
            let facetItemIndex = 1;
            let facetTotalCount = null;
            cy.visit('/browse')
                .get(".facets-body .facet.closed").first().click({ force: true }).end()
                .get(".facets-body div.facet:not([data-field=''])").then(function ($facetTotalCount) {
                    facetTotalCount = $facetTotalCount.length;
                    facetItemIndex = Math.min(1, parseInt(facetTotalCount / 3));
                })
                .get(".facets-body div.facet:not([data-field='']):nth-child(" + facetItemIndex + ") > h5").scrollToCenterElement().click({ force: true }).end()
                .get(".facet.open .facet-list-element a.term .facet-item").first().click({ force: true }).end()
                .get("a#search-menu-item").click().end()
                .get('form.navbar-search-form-container button#search-item-type-selector').should('be.visible').click().end()
                .get('form.navbar-search-form-container div.dropdown-menu a[data-key="Within"]').click().end()
                .get('form.navbar-search-form-container input[name="q"]').focus().type('human', { delay: 0 }).end()
                .get(".btn.btn-outline-light.w-100[data-id='global-search-button']").click().end()
                .get('#slow-load-container').should('not.have.class', 'visible').end()
                .get(".facet-list-element.selected .facet-item").then(function ($selectedFacet) {
                    expect($selectedFacet.length).to.be.greaterThan(0);
                });
        });

        it('"Biosource" option works, takes us to biosource search results', function () {
            cy.visit('/')
                .get("a#search-menu-item").click().end()
                .get('form.navbar-search-form-container button#search-item-type-selector').should('be.visible').click().end()
                .get('form.navbar-search-form-container div.dropdown-menu a[data-key="Item"]').click().end()
                .get('input[name="q"]').focus().type('hamster', { delay: 0 }).end()
                .get(".btn.btn-outline-light.w-100[data-id='global-search-button']").click().end()
                .get('#slow-load-container').should('not.have.class', 'visible').end()
                .get('#page-title-container .page-title').should('contain', 'Search').end();
        });

        it('"Publication" option works, takes us to publication search results', function () {
            cy.visit('/')
                .get("a#search-menu-item").click().end()
                .get('form.navbar-search-form-container button#search-item-type-selector').should('be.visible').click().end()
                .get('form.navbar-search-form-container div.dropdown-menu a[data-key="Publication"]').click().end()
                .get('input[name="q"]').focus().type('nature', { delay: 0 }).end()
                .get(".btn.btn-outline-light.w-100[data-id='global-search-button']").click().end()
                .get('#slow-load-container').should('not.have.class', 'visible').end()
                .get('#page-title-container .page-title').should('contain', 'Publications').end();
        });

        it('SearchBox input works, goes to /search', function () {
            cy.get("a#search-menu-item").click().end()
                .get('form.navbar-search-form-container button#search-item-type-selector').should('be.visible').click().end()
                .get('form.navbar-search-form-container div.dropdown-menu a[data-key="Item"]').click().end()
                .get('form.navbar-search-form-container input[name="q"]').focus().type('mouse', { delay: 0 }).end()
                .get(".btn.btn-outline-light.w-100[data-id='global-search-button']").click().end()
                .get('#slow-load-container').should('not.have.class', 'visible').end()
                .get('#page-title-container .page-title').should('contain', 'Search').end();

        });
    });

});
