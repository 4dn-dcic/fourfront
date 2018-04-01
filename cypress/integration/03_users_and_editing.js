
/**
 * This file of tests only gets executed by Travis CI
 */


describe('Test logging in, navigating to profile page, editing last_name, & editing it back.', function () {


    context('Wrangler User Profile', function () {

        before(function(){
            cy.visit('/');
        });

        /** Cypress clears browser state between tests so need to use beforeEach rather than before. This may change according to Cypress - https://github.com/cypress-io/cypress/issues/747 */
        /*
        beforeEach(function(){
            cy.login4DN({ 'email' : 'wrangler@wrangler.com' });
        });
        */

        it('Ensure logged in, visit profile page, edit last name 2x.', function(){

            cy.login4DN({ 'email' : 'wrangler@wrangler.com', 'useEnvToken' : false }).end().get('ul.navbar-acct li.user-account-item').should('have.class', 'is-logged-in').then((accountListItem)=>{
                expect(accountListItem.children('#user_actions_dropdown').text()).to.contain('Wrangler');
            }).end().get("#user_actions_dropdown").click().then(()=>{
                cy.get('ul.dropdown-menu[aria-labelledby="user_actions_dropdown"] a#profile').click().then(()=>{
                    cy.get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler Wrangler").then((title)=>{
                        // Edit wrangler last name
                        cy.get('.page-container .user-title-row-container h1.user-title .last_name .value.saved a.edit-button').click();
                        cy.get('.page-container .user-title-row-container h1.user-title .last_name .value.editing input').clear().type('SuperWrangler').then((inputfield)=>{
                            //inputfield.type('SuperWrangler');
                            cy.wait(100);
                            cy.get('.page-container .user-title-row-container h1.user-title .last_name .value.editing .save-button').click().then(()=>{
                                cy.get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler SuperWrangler");

                                // After reloading on datastore=database, last name stays edited. Then change back.
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
                });
            });

        });

    });



});
