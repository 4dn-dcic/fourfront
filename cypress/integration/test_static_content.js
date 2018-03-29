

describe('Can navigate around Static Pages in top nav dropdown', function () {



    context('Homepage content is ok.', function () {


        it('Home Page Title is present and matching expected strings.', function () {

            cy.visit('/');

            cy.title().should('include', '4DN Data Portal');

            cy.get('#page-title-container span.title').should('have.text', '4D Nucleome Data Portal');

            cy.get('#page-title-container div.subtitle').should('have.text', 'A platform to search, visualize, and download nucleomics data.');

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
                                    cy.get('#sHelp').click().wait(500).then(()=>{
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
                                            cy.get('div.table-of-contents li.table-content-entry a').last().click().end().wait(1500).then(()=>{
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


describe('Test logging in, navigating to profile page, editing last_name, & editing it back.', function () {


    context('Login as wrangler@wrangler.com (via impersonating user\'s JWT) works.', function () {

        before(function(){
            cy.visit('/');
        });

        /** Cypress clears browser state between tests so need to use beforeEach rather than before. This may change according to Cypress - https://github.com/cypress-io/cypress/issues/747 */
        beforeEach(function(){
            cy.login4DN({ 'email' : 'wrangler@wrangler.com' });
        });

        it('Top right menu dropdown has "Wrangler" (first name).', function(){
            
            cy.get('ul.navbar-acct li.user-account-item').should('have.class', 'is-logged-in').then((accountListItem)=>{
                expect(accountListItem.children('#user_actions_dropdown').text()).to.contain('Wrangler');
            });

        });

        it('Can click and visit user profile from top-right menu; it is correct user profile', function(){

            cy.get("#user_actions_dropdown").click().then(()=>{
                cy.get('ul.dropdown-menu[aria-labelledby="user_actions_dropdown"] a#profile').click().then(()=>{
                    cy.get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler Wrangler");
                });
            });

        });

        it('Can edit last name of Wrangler', function(){

            cy.get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler Wrangler").then((title)=>{
                cy.get('.page-container .user-title-row-container h1.user-title .last_name .value.saved a.edit-button').click();
                cy.get('.page-container .user-title-row-container h1.user-title .last_name .value.editing input').should('have.value', 'Wrangler').clear().type('SuperWrangler').then((inputfield)=>{
                    //inputfield.type('SuperWrangler');
                    cy.wait(100);
                    cy.get('.page-container .user-title-row-container h1.user-title .last_name .value.editing .save-button').click().then(()=>{
                        cy.get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler SuperWrangler");
                    });
                });
            });

        });

        it('After reloading page, name stays updated in datastore=database.', function(){
            cy.url().then((currUrl)=>{
                cy.visit(currUrl + '?datastore=database').then(()=>{
                    cy.get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler SuperWrangler").then(()=>{

                        // Cleanup & test again
                        cy.get('.page-container .user-title-row-container h1.user-title .last_name .value.saved a.edit-button').click();
                        cy.get('.page-container .user-title-row-container h1.user-title .last_name .value.editing input').should('have.value', 'SuperWrangler').clear().type('Wrangler').then((inputfield)=>{
                            cy.wait(100);
                            cy.get('.page-container .user-title-row-container h1.user-title .last_name .value.editing .save-button').click().then(()=>{
                                cy.get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler Wrangler").then(()=>{
                                    cy.wait(100);
                                    cy.visit(currUrl + '?datastore=database').then(()=>{
                                        cy.get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler Wrangler");
                                    });
                                });
                            });
                        });
                    });
                });
            });

        });

    });



});