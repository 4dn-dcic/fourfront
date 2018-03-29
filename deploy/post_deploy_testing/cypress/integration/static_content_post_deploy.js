

// Run static CI (Travis) tests first.
const staticContentTestsDeploy = require('./../../../../cypress/integration/test_static_content');


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