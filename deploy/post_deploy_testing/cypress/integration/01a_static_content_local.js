
/**
 * This file of tests gets executed by Travis CI and in post-deploy tests (by being imported into).
 */

describe('Deployment/CI Static Page & Content Tests', function () {

    context('Homepage content is ok.', function () {


        it('Home Page Title is present and matching expected strings.', function () {

            cy.visit('/').end()
                .title().should('include', '4DN Data Portal').end()
                .get('#page-title-container span.title').should('have.text', '4D Nucleome Data Portal').end()
                .get('#page-title-container div.subtitle').should('have.text', 'A platform to search, visualize, and download nucleomics data.');

        });

        it('At least 3 announcements on the page.', function () {

            cy.window().scrollTo('bottom').wait(100).end()
                .get('.home-content-area div.announcement').should('have.length.greaterThan', 2).end();

        });


    });


    context('Each help page in dropdown has unique title; ToC works.', function () {

        it('We start on homepage (from previous test)', function(){
            cy.title().should('equal', '4DN Data Portal');
        });

        it('Click & visit each page from menu, ensure ToC exists somewhere, ensure ToC works.', function(){

            cy.on('uncaught:exception', function(err, runnable){

                expect(err.message).to.include("return response;");

                Cypress.log({
                    'name' : "Negligible JSON err.",
                    'message' : "Hit error re: non-serializable function; fixed in subseq. deploys."
                });

                return false;
            });

            cy.get('#help-menu-item').click().wait(500).then(()=>{
                cy.get('div.big-dropdown-menu div.level-1-title-container a, div.big-dropdown-menu a.level-2-title').then((listItems)=>{
                    console.log(listItems);

                    expect(listItems).to.have.length.above(2); // At least 3 help pages in dropdown.
                    var allLinkElementIDs = Cypress._.map(listItems, function(liEl){
                        return Cypress.$(liEl).attr('id');
                    });

                    cy.get('#page-title-container span.title').should('have.text', '4D Nucleome Data Portal').then((title)=>{

                        let prevTitle = title.text();
                        let count = 0;
                        let haveWeSeenPageWithTableOfContents = false;

                        function doVisit(listItem){

                            function finish(titleText){
                                count++;
                                Cypress.log({
                                    'name' : "Help Page " + count + '/' + listItems.length,
                                    'message' : 'Visited page with title "' + titleText + '".'
                                });
                                if (count < listItems.length){
                                    cy.get('#help-menu-item').click().wait(500).then(()=>{
                                        cy.get('div.big-dropdown-menu #' + allLinkElementIDs[count]).click().wait(300).then((nextListItem)=>{
                                            doVisit(nextListItem);
                                        });
                                    });
                                }
                            }
                            cy.wait(300).get('#page-title-container span.title').should('not.have.text', prevTitle).then((t)=>{
                                var titleText = t.text();
                                expect(titleText).to.have.length.above(0);
                                prevTitle = titleText;

                                if (!haveWeSeenPageWithTableOfContents) {
                                    cy.window().then((w)=>{
                                        if (w.document.querySelectorAll('div.table-of-contents li.table-content-entry a').length > 0){
                                            haveWeSeenPageWithTableOfContents = true;
                                            const origScrollTop = w.scrollY;
                                            cy.wrap(w).scrollTo('top').end().get('div.table-of-contents li.table-content-entry a').last().click({ force: true }).end().wait(1500).then(()=>{
                                                expect(w.scrollY).to.not.equal(origScrollTop);
                                                finish(titleText);
                                            });
                                        } else {
                                            finish(titleText);
                                        }
                                    });

                                } else {
                                    finish(titleText);
                                }

                            });
                        }
                        listItems[0].click();
                        doVisit(listItems[count]);

                    });

                });
            });

        });


    });

});
