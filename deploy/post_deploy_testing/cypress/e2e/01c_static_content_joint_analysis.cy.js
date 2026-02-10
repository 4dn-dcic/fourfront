describe('Joint Analysis Page', function () {

    before(function(){
        cy.visit('/joint-analysis');
    });

    context("Expandable Matrix Section", function(){

        const yAxisTerms = ['DNA Binding', 'Open Chromatin', 'FISH', 'Proximity-seq'];
        const xAxisTerms = ['H1-hESC', 'HFF'];//['H1-hESC', 'H1-DE', 'HFFc6'];

        it('Have at least one of each term - ' + yAxisTerms.join(', ') + ' + ' + xAxisTerms.join(', '), function(){
            const seenY = new Set();
            const seenX = new Set();
            cy.get('.stacked-block-viz-container').first().within(($firstMatrix)=>{
                cy
                    .get(".header-for-viz .column-group-header > .inner").each(function($el, idx){
                        const colHeaderText = $el.text().toLowerCase();
                        xAxisTerms.forEach(function(xTerm){
                            if (seenX.has(xTerm)) return;
                            if (colHeaderText.indexOf(xTerm.toLowerCase()) > -1){
                                seenX.add(xTerm);
                            }
                        });
                    }).end()
                    .get(".row.grouping-row > .label-section > .label-container > h4").each(function($el, idx){
                        const rowLabelText = $el.text().toLowerCase();
                        yAxisTerms.forEach(function(yTerm){
                            if (seenY.has(yTerm)) return;
                            if (rowLabelText.indexOf(yTerm.toLowerCase()) > -1){
                                seenY.add(yTerm);
                            }
                        });
                    }).end()
                    .then(function(){
                        expect(seenX.size).to.equal(xAxisTerms.length);
                        expect(seenY.size).to.equal(yAxisTerms.length);
                    });
            });
        });

        /*
        it('X-Axis headers are in proper order', function(){
            cy.get('.stacked-block-viz-container').first().within(($firstMatrix)=>{
                cy.get('.header-for-viz .column-group-header').should('have.length.greaterThan', 1).then(($headers)=>{
                    Cypress._.forEach($headers, function(h, idx){
                        expect(h.innerText).to.equal(xAxisTerms[idx]);
                    });
                });
            });
        });
        */

        it('Have at least 16 sets depicted in tiles (logged out)', function(){
            cy.get('.stacked-block-viz-container').first().within(($firstMatrix)=>{
                cy.get('.block-container-group .stacked-block').then(($blocks)=>{
                    let totalCount = 0;
                    Cypress._.forEach($blocks, function(block){
                        const count = parseInt(Cypress.$(block).text());
                        expect(isNaN(count)).to.equal(false);
                        expect(count).to.be.greaterThan(0);
                        totalCount += count;
                    });
                    expect(totalCount).to.be.greaterThan(15);
                });
            });
        });

        it('Have more (>50) sets depicted when logged in', function(){

            cy.on('uncaught:exception', function(err, runnable){

                expect(err.message).to.include("'options' of null");

                Cypress.log({
                    'name' : "XHR Callback",
                    'message' : "Hit AJAX callback timing error. Ignored."
                });

                return false;
            });


            let origTotalCount = 0;


            cy.get('.stacked-block-viz-container').first().within(function($firstMatrix){
                return cy.get('.block-container-group .stacked-block').then(($blocks)=>{
                    Cypress._.forEach($blocks, function(block){
                        origTotalCount += parseInt(Cypress.$(block).text());
                    });
                }).end();
            }).end().login4DN({ 'email' : 'ud4dntest@gmail.com', 'useEnvToken' : false }).get('#account-menu-item').scrollIntoView().should('be.visible');

            cy.get('.stacked-block-viz-container').first().within(($firstMatrix)=>{
                let nextTotalCount = 0;
                return cy.get('.block-container-group .stacked-block').should('have.length.greaterThan', 20).then(($nextBlocks)=>{
                    Cypress._.forEach($nextBlocks, function(block){
                        nextTotalCount += parseInt(Cypress.$(block).text());
                    });
                    expect(nextTotalCount).to.be.greaterThan(origTotalCount);
                    expect(nextTotalCount).to.be.greaterThan(49);
                });
            }).end().logout4DN();
        });

    });

    context("HiGlass Static Section(s)", function () {

        // Track HiGlass request failures in a simple counter so we can print a summary.
        beforeEach(function () {
            Cypress.env('higlass_tileset_seen', 0);
            Cypress.env('higlass_tiles_429', 0);
            Cypress.env('higlass_tiles_5xx', 0);
            Cypress.env('higlass_tiles_other4xx', 0);
            Cypress.env('higlass_tiles_neterr', 0);

            cy.intercept('GET', '**/api/v1/tileset_info/**', (req) => {
                Cypress.env('higlass_tileset_seen', (Cypress.env('higlass_tileset_seen') || 0) + 1);

                // Log request URL once per match (useful if endpoint changes)
                cy.task('log', `HiGlass tileset_info request: ${req.url}`);

                req.on('response', (res) => {
                    cy.task('log', `HiGlass tileset_info status=${res.statusCode} server=${res.headers?.server || ''}`);
                });

                req.on('error', (err) => {
                    cy.task('error', `HiGlass tileset_info NETWORK ERROR: ${err.message}`);
                });
            }).as('tilesetInfo');

            cy.intercept('GET', '**/api/v1/tiles/**', (req) => {
                req.on('response', (res) => {
                    const s = res.statusCode || 0;
                    if (s === 429) Cypress.env('higlass_tiles_429', (Cypress.env('higlass_tiles_429') || 0) + 1);
                    else if (s >= 500) Cypress.env('higlass_tiles_5xx', (Cypress.env('higlass_tiles_5xx') || 0) + 1);
                    else if (s >= 400) Cypress.env('higlass_tiles_other4xx', (Cypress.env('higlass_tiles_other4xx') || 0) + 1);
                });

                req.on('error', (err) => {
                    Cypress.env('higlass_tiles_neterr', (Cypress.env('higlass_tiles_neterr') || 0) + 1);
                    cy.task('error', `HiGlass tiles NETWORK ERROR: ${err.message}`);
                });
            }).as('tiles');
        });

        afterEach(function () {
            const seen = Cypress.env('higlass_tileset_seen') || 0;
            const a429 = Cypress.env('higlass_tiles_429') || 0;
            const a5xx = Cypress.env('higlass_tiles_5xx') || 0;
            const a4xx = Cypress.env('higlass_tiles_other4xx') || 0;
            const net = Cypress.env('higlass_tiles_neterr') || 0;

            // This will appear in GitHub Actions logs and Cypress Cloud terminal output.
            cy.task('log', `HiGlass summary: tileset_info_seen=${seen} tiles_429=${a429} tiles_5xx=${a5xx} tiles_other4xx=${a4xx} tiles_neterr=${net}`);
        });

        it("HiGlass initializes (very basic)", function () {

            // IMPORTANT:
            // HiGlass dependencies are lazy-loaded and the viewer often initializes only on a fresh page load + when it becomes visible.
            // Since testIsolation=false and earlier tests change page state, we do a fresh visit here to mimic real user behavior.
            cy.visit('/joint-analysis');

            // Trigger lazy rendering / visibility-based initialization
            cy.window().scrollTo('bottom');

            // Wait for at least one tileset_info call. If none happens, HiGlass never started initializing.
            cy.wait('@tilesetInfo', { timeout: 120000 });

            // Give the viewer some time to request tiles after tileset_info resolves
            cy.wait(3000);

            // Basic DOM visibility assertion for HiGlass renderer
            cy.get(
                'div.tiled-plot-div div.track-renderer-div div.center-track-container',
                { timeout: (10 * 60 * 1000) }
            ).should('be.visible');

            // If we see 429/5xx here, it strongly suggests throttling/overload in CI (often due to parallelization).
            cy.then(() => {
                expect(Cypress.env('higlass_tiles_429') || 0, 'HiGlass tiles 429 count').to.eq(0);
                expect(Cypress.env('higlass_tiles_5xx') || 0, 'HiGlass tiles 5xx count').to.eq(0);
            });

        });

    });


});