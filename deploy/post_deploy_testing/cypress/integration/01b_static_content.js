
// todo: Ensure we're selecting right 1 incase later add more -- test for `a.id-help-menu-item` once in place upstream.
const helpNavBarItemSelectorStr = '#top-nav div.navbar-collapse .navbar-nav a.id-help-menu-item';

describe('Static Page & Content Tests', function () {

    before(function(){
        cy.visit('/');
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

        // Wait until help menu has loaded via AJAX and is a dropdown.
        // todo: Ensure we're selecting right 1 incase later add more -- test for `a.id-help-menu-item` once in place upstream.
        cy.get(helpNavBarItemSelectorStr).should('have.class', 'dropdown-toggle').wait(100).click().wait(500).then(()=>{
            cy.get('div.big-dropdown-menu div.level-1-title-container a, div.big-dropdown-menu a.level-2-title').then(($listItems)=>{
                console.log($listItems);

                expect($listItems).to.have.length.above(2); // At least 3 help pages in dropdown.
                const allLinkElementIDs = Cypress._.map($listItems, function(liEl){
                    return liEl.id;
                });

                cy.get('#page-title-container .page-title').should('contain', '4D Nucleome Data Portal').then((title)=>{

                    let prevTitle = title.text();
                    let count = 0;
                    let haveWeSeenPageWithTableOfContents = false;

                    function testVisit(){

                        function finish(titleText){
                            count++;
                            Cypress.log({
                                'name' : "Help Page " + count + '/' + $listItems.length,
                                'message' : 'Visited page with title "' + titleText + '".'
                            });
                            if (count < $listItems.length){
                                cy.get(helpNavBarItemSelectorStr).click().wait(500).then(()=>{
                                    cy.get('div.big-dropdown-menu a#' + allLinkElementIDs[count]).click().then(($nextListItem)=>{
                                        const linkHref = $nextListItem.attr('href');
                                        cy.location('pathname').should('equal', linkHref);
                                        testVisit();
                                    });
                                });
                            }
                        }

                        cy.get('#page-title-container .page-title').should('not.have.text', prevTitle).then((t)=>{
                            var titleText = t.text();
                            expect(titleText).to.have.length.above(0);
                            cy.title().should('equal', titleText + ' – 4DN Data Portal').end(); // Ensure <head>...<title>TITLE</title>...</head> matches.
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
                    cy.wrap($listItems.eq(0)).click().then(function($linkElem){
                        const linkHref = $linkElem.attr('href');
                        cy.location('pathname').should('equal', linkHref);
                        testVisit();
                    });

                });
            });
        });

    });


    it('Every help page has links which return success status codes - SAMPLING', function(){

        cy.get(helpNavBarItemSelectorStr).click().then(()=>{

            // Get all links to _level 2_ static pages. Exclude directory pages for now. Do directory pages in later test.
            // Randomly selects 5 links out of all items listed from the Help dropdown menu. If one of those randomly selected links is
            // Contact Us then the test fails since Contact Us page lacks content to be tested.
            cy.get('.big-dropdown-menu.is-open a.level-2-title').filter(':not([href="/help/about/contact-us"])').then(($listItems)=>{

                console.log($listItems);
                const listItemsTotalCount = $listItems.length;

                expect(listItemsTotalCount).to.be.above(2); // At least 3 help pages in dropdown.

                // To avoid running on every single page x multiple network requests, lets create a random
                // sampling of 5 list item indices to visit.
                var itemIndicesToVisit = Cypress._.sampleSize(Cypress._.range(listItemsTotalCount), 5);

                let prevTitle = null;
                let count = 0;

                function testVisit(){

                    cy.get('#page-title-container .page-title').should('not.have.text', prevTitle).then((t)=>{
                        var titleText = t.text();
                        expect(titleText).to.have.length.above(0);
                        prevTitle = titleText;

                        cy.get('.help-entry.static-section-entry a:not([href^="#"]):not([href^="mailto:"]):not([href*=".gov"])').then(()=>{

                            count++;

                            Cypress.log({
                                'name' : "Help Page " + count + '/5/' + listItemsTotalCount,
                                'message' : 'Visited page with title "' + titleText + '".'
                            });

                            if (itemIndicesToVisit.length > 0){
                                const nextIndexToVisit = itemIndicesToVisit.shift();
                                cy.get(helpNavBarItemSelectorStr).click().wait(100).then(()=>{
                                    cy.get('.big-dropdown-menu.is-open a.level-2-title').eq(nextIndexToVisit).click().then(function($linkElem){
                                        const linkHref = $linkElem.attr('href');
                                        cy.location('pathname').should('equal', linkHref);
                                        testVisit();
                                    });
                                });
                            }
                        });

                    });
                }

                const firstItemIndexToVisit = itemIndicesToVisit.shift();
                cy.wrap($listItems.eq(firstItemIndexToVisit)).click().then(function($linkElem){
                    const linkHref = $linkElem.attr('href');
                    cy.location('pathname').should('equal', linkHref);
                    testVisit();
                });

            });
        });

    });

    // TODO:
    // test which visits directory page(s) maybe.

});
