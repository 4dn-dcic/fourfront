
/**
 * This file of tests gets executed by Travis CI and in post-deploy tests (by being imported into).
 */


describe('Static Page & Content Tests', function () {



    context('Homepage content is ok.', function () {


        it('Home Page Title is present and matching expected strings.', function () {

            cy.visit('/').end()
                .title().should('include', '4DN Data Portal').end()
                .get('#page-title-container span.title').should('have.text', '4D Nucleome Data Portal').end()
                .get('#page-title-container div.subtitle').should('have.text', 'A platform to search, visualize, and download nucleomics data.').end().screenshot();

        });


    });


    context('Each help page in dropdown has unique title; ToC works.', function () {

        before(function(){
            cy.visit('/').then(()=>{
                cy.title().should('include', '4DN Data Portal');
            });
        });


        it('Click & visit each page from menu, ensure ToC exists somewhere, ensure ToC works.', function(){

            cy.get('#sHelp').click().then(()=>{
                cy.get('ul[aria-labelledby="sHelp"] li a').then((listItems)=>{
                    console.log(listItems);

                    expect(listItems).to.have.length.above(2); // At least 3 help pages in dropdown.

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

                                if (!haveWeSeenPageWithTableOfContents) {
                                    cy.window().then((w)=>{
                                        if (w.document.querySelectorAll('div.table-of-contents li.table-content-entry a').length > 0){
                                            haveWeSeenPageWithTableOfContents = true;
                                            const origScrollTop = w.scrollY;
                                            cy.get('div.table-of-contents li.table-content-entry a').last().click().end().wait(750).then(()=>{
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
