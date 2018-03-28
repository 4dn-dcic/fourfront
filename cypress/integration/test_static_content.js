

describe('Some Initial Static Tests', function () {



    context('Homepage content is ok, login works, user profile works.', function () {


        it('Home Page Title is present and matching expected strings.', function () {

            cy.visit('/');

            cy.title().should('include', '4DN Data Portal');

            cy.get('#page-title-container span.title').should('have.text', '4D Nucleome Data Portal');

            cy.get('#page-title-container div.subtitle').should('have.text', 'A platform to search, visualize, and download nucleomics data.');

        });


    });

    context('Login as wrangler@wrangler.com (via impersonating user\'s JWT) works.', function () {

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

            // TODO: Increase this wait, or move this test to post-deploy tests.
            //if (Cypress.env('SECRET_KEY')){ // We're on TRAVIS (this be set in Travis env vars)
            //    cy.wait(45000); // Wait 30 seconds before proceeding to next test re: indexing. Travis VMs are small so we need to wait else we'd time out.
            //}
        });

    });


    context('Can navigate around Help pages', function () {

        before(function(){
            cy.visit('/').then(()=>{
                cy.title().should('include', '4DN Data Portal');
            });
        });


        it('Help dropdown has some items, we can click & visit them, and each page has different title.', function(){

            cy.get('#sHelp').click().then(()=>{
                cy.get('ul[aria-labelledby="sHelp"] li a').then((listItems)=>{
                    console.log(listItems);

                    expect(listItems).to.have.length.above(1); // At least 2 help pages in dropdown.

                    cy.get('#page-title-container span.title').should('have.text', '4D Nucleome Data Portal').then((title)=>{

                        let prevTitle = title.text();
                        let count = 0;

                        function doVisit(listItem, ){
                            listItem.click();
                            cy.get('#page-title-container span.title')
                                .should('not.have.text', prevTitle).then((t)=>{
                                    var titleText = t.text();
                                    expect(titleText).to.have.length.above(0);
                                    prevTitle = titleText;

                                    // Finish
                                    count++;
                                    Cypress.log({
                                        'name' : "Help Page " + count + '/' + listItems.length,
                                        'message' : 'Visited page with title "' + titleText + '".'
                                    });
                                    if (count < listItems.length){
                                        doVisit(listItems[count]);
                                    }
                                });
                        }

                        doVisit(listItems[count]);

                    });
                    
                });
            });

        });


    });





});