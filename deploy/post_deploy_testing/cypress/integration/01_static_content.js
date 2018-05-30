

// Run static CI (Travis) tests first.
const staticContentTestsDeploy = require('./../../../../cypress/integration/01_static_content_common');


describe('Post-Deployment Static Page & Content Tests', function () {

    it.skip('Every help page has links which return success status codes', function(){

        cy.get('#sHelp').click().then(()=>{
            cy.get('ul[aria-labelledby="sHelp"] li a').then((listItems)=>{
                console.log(listItems);

                expect(listItems).to.have.length.above(2); // At least 3 help pages in dropdown.

                cy.get('#page-title-container span.title').should('have.text', 'About').then((title)=>{

                    let prevTitle = title.text();
                    let count = 0;

                    function doVisit(listItem){

                        function finish(titleText){
                            count++;
                            Cypress.log({
                                'name' : "Help Page " + count + '/' + listItems.length,
                                'message' : 'Visited page with title "' + titleText + '".'
                            });
                            if (count < listItems.length){
                                cy.get('#sHelp').click().wait(100).then(()=>{
                                    cy.get('ul[aria-labelledby="sHelp"] li:nth-child(' + (count + 1) + ') a').click().then((nextListItem)=>{
                                        doVisit(nextListItem);
                                    });
                                });
                            }
                        }
                        cy.wait(100).get('#page-title-container span.title').should('not.have.text', prevTitle).then((t)=>{
                            var titleText = t.text();
                            expect(titleText).to.have.length.above(0);
                            prevTitle = titleText;

                            cy.get('.help-entry.static-section-entry a:not([href^="#"]):not([href^="mailto:"])').each(($linkElem)=>{
                                const linkHref = $linkElem.attr('href');
                                console.log($linkElem.attr('href'));
                                cy.request(linkHref);
                            }).then(()=>{
                                finish(titleText);
                            });

                        });
                    }
                    listItems[0].click();
                    doVisit(listItems[count]);

                });

            });
        });

    });

    context("Joint Analysis Page", function(){

        before(function(){
            cy.visit('/joint-analysis-plans');
        });

        it('Redirected to /joint-analysis from /joint-analysis-plans', function(){
            cy.location('pathname').should('equal', '/joint-analysis');
        });

        const yAxisTerms = ['ATAC-seq', 'CHIA-pet', 'DAM-ID seq', 'Repli-seq', 'in situ Hi-C'];
        const xAxisTerms = ['H1-hESC', 'HFFc6'];

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

        it("HiGlass initializes (very basic)", function(){
            cy.get('div.CenterTrack-module_center-track-3ptRW').wait(500);
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
            cy.get('.stacked-block-viz-container').first().within(($firstMatrix)=>{
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


});
