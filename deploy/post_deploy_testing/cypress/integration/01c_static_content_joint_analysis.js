describe('Joint Analysis Page', function () {

    before(function(){
        cy.visit('/joint-analysis-plans');
    });

    it('Redirected to /joint-analysis from /joint-analysis-plans', function(){
        cy.location('pathname').should('equal', '/joint-analysis');
    });

    context("Expandable Matrix Section", function(){

        const yAxisTerms = ['DNA Binding', 'Open Chromatin', 'Organelle-seq', 'Repli-seq'];
        const xAxisTerms = ['H1-hESC', 'H1-DE', 'HFFc6'];


        it('Have at least one of each term - ' + yAxisTerms.join(', ') + ' + ' + xAxisTerms.join(', '), function(){
            cy.get('.stacked-block-viz-container').first().within(($firstMatrix)=>{
                Cypress._.forEach(yAxisTerms, function(term){
                    cy.contains(term);
                });
                Cypress._.forEach(xAxisTerms, function(term){
                    cy.contains(term);
                });
            });
        });

        it('X-Axis headers are in proper order', function(){
            cy.get('.stacked-block-viz-container').first().within(($firstMatrix)=>{
                cy.get('.header-for-viz .column-group-header').should('have.length.greaterThan', 1).then(($headers)=>{
                    Cypress._.forEach($headers, function(h, idx){
                        expect(h.innerText).to.equal(xAxisTerms[idx]);
                    });
                });
            });
        });

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
            }).end().login4DN().wait(500).end().get('.stacked-block-viz-container').first().within(($firstMatrix)=>{
                let nextTotalCount = 0;
                return cy.get('.block-container-group .stacked-block').should('have.length.greaterThan', 20).then(($nextBlocks)=>{
                    Cypress._.forEach($nextBlocks, function(block){
                        nextTotalCount += parseInt(Cypress.$(block).text());
                    });
                    expect(nextTotalCount).to.be.greaterThan(origTotalCount);
                    expect(nextTotalCount).to.be.greaterThan(49);
                });
            }).wait(250).end().window().screenshot().end().wait(250).end().logout4DN();
        });

    });

    context("HiGlass Static Section(s)", function(){

        it("HiGlass initializes (very basic)", function(){
            cy.window().scrollTo('bottom').end()
                .wait(2000).end().get('div.CenterTrack-module_center-track-3ptRW', { 'timeout' : (10 * 60 * 1000) }).wait(500);
        });

    });

});