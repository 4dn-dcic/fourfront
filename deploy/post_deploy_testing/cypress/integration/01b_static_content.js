
describe('Static Page & Content Tests', function () {

    before(function(){
        cy.visit('/');
    });

    it('Every help page has links which return success status codes - SAMPLING', function(){

        cy.get('#help-menu-item').click().then(()=>{

            // Get all links to _level 2_ static pages. Exclude directory pages for now. Do directory pages in later test.
            cy.get('.big-dropdown-menu.is-open a.level-2-title').then((listItems)=>{

                console.log(listItems);
                const listItemsTotalCount = listItems.length;

                expect(listItemsTotalCount).to.be.above(2); // At least 3 help pages in dropdown.

                // To avoid running on every single page x multiple network requests, lets create a random
                // sampling of 5 list item indices to visit.
                var itemIndicesToVisit = Cypress._.sampleSize(Cypress._.range(listItemsTotalCount), 5);

                // We're starting on homepage, initial title -
                cy.get('#page-title-container span.title').should('have.text', '4D Nucleome Data Portal').then((title)=>{

                    let prevTitle = title.text();
                    let count = 0;

                    function doVisit(){

                        function finish(titleText){
                            count++;
                            Cypress.log({
                                'name' : "Help Page " + count + '/' + listItemsTotalCount,
                                'message' : 'Visited page with title "' + titleText + '".'
                            });

                            if (itemIndicesToVisit.length > 0){
                                var nextIndexToVisit = itemIndicesToVisit.shift();
                                cy.get('#help-menu-item').click().wait(100).then(()=>{
                                    cy.get('.big-dropdown-menu.is-open a.level-2-title').eq(nextIndexToVisit).click().then(doVisit);
                                });
                            }
                        }
                        cy.wait(100).get('#page-title-container span.title').should('not.have.text', prevTitle).then((t)=>{
                            var titleText = t.text();
                            expect(titleText).to.have.length.above(0);
                            prevTitle = titleText;

                            cy.get('.help-entry.static-section-entry a:not([href^="#"]):not([href^="mailto:"]):not([href*=".gov"])').each(($linkElem)=>{
                                const linkHref = $linkElem.attr('href');
                                console.log($linkElem.attr('href'));
                                cy.request(linkHref);
                            }).then(()=>{
                                finish(titleText);
                            });

                        });
                    }

                    const firstItemIndexToVisit = itemIndicesToVisit.shift();
                    listItems[firstItemIndexToVisit].click();
                    doVisit();

                });

            });
        });

    });

    // TODO:
    // test which visits directory page(s) maybe.

});
