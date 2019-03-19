
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

});
