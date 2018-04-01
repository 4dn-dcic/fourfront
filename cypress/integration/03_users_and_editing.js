
/**
 * This file of tests only gets executed by Travis CI
 */


describe('Impersonate user JWT, navigate to profile, edit last_name to & back.', function () {


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
            }).end()
            .get("#user_actions_dropdown").click().wait(100).end()
            .get('ul.dropdown-menu[aria-labelledby="user_actions_dropdown"] a#profile').click().end()
            .get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler Wrangler").end()
            // Edit wrangler last name
            .get('.page-container .user-title-row-container h1.user-title .last_name .value.saved a.edit-button').click().end()
            .get('.page-container .user-title-row-container h1.user-title .last_name .value.editing input').clear().type('SuperWrangler').then((inputfield)=>{
                //inputfield.type('SuperWrangler');
                return cy.wait(100).get('.page-container .user-title-row-container h1.user-title .last_name .value.editing .save-button').click().end()
                .get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler SuperWrangler").end()
                .url().then((currUrl)=>{ // After reloading on datastore=database, last name stays edited. Then change back.
                    return cy.visit(currUrl + '?datastore=database').end()
                    .get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler SuperWrangler").end()
                    // Cleanup & test again
                    .get('.page-container .user-title-row-container h1.user-title .last_name .value.saved a.edit-button').click().end()
                    .get('.page-container .user-title-row-container h1.user-title .last_name .value.editing input').should('have.value', 'SuperWrangler').clear().type('Wrangler').then((inputfield)=>{
                        return cy.wait(100)
                        .get('.page-container .user-title-row-container h1.user-title .last_name .value.editing .save-button').click().end()
                        .get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler Wrangler").end()
                        .visit(currUrl + '?datastore=database').end()
                        .get('.page-container .user-title-row-container h1.user-title').should('have.text', "Wrangler Wrangler").end();
                    });
        
                });


            });


        });

    });



});
