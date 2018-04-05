
describe('Impersonate user JWT, navigate to profile, edit last_name to & back.', function () {


    context('Wrangler User Profile', function () {

        beforeEach(function(){
            cy.visit('/');
        });

        /** Cypress clears browser state between tests so need to use beforeEach rather than before. This may change according to Cypress - https://github.com/cypress-io/cypress/issues/747 */
        /*
        beforeEach(function(){
            cy.login4DN({ 'email' : 'wrangler@wrangler.com' });
        });
        */

        it('Ensure logged in, visit profile page, add & remove access key', function(){

            cy.login4DN({ 'email' : 'ud4dntest@gmail.com', 'useEnvToken' : false }).end().get('ul.navbar-acct li.user-account-item').should('have.class', 'is-logged-in').then((accountListItem)=>{
                expect(accountListItem.children('#user_actions_dropdown').text()).to.contain('Frontend');
            }).end()
                .get("#user_actions_dropdown").click().wait(100).end()
                .get('ul.dropdown-menu[aria-labelledby="user_actions_dropdown"] a#profile').click().end()
                .get('.page-container .user-title-row-container h1.user-title').should('contain', "Frontend").end() // Test only for first name as we're editing last name & it may change re: delayed indexing, etc.
                .get('.page-container .access-keys-container h3').should('contain', "Access Keys").end()
                .get('.page-container .access-keys-container #add-access-key').click().wait(100).end()
                .get('.modal-body').should('contain', 'Access Key ID').should('contain', 'Secret Access Key').end()
                .get('.modal-body .key-value div:first-child dd').invoke('text').then((accessKeyID)=>{
                    return cy.get('.fade.in.modal').click().wait(500).end()
                        .get('.page-container .access-keys-container').should('contain', accessKeyID).end()
                        .get('.page-container .access-keys-container .access-keys-table tr:last-child .access-key-buttons .btn-danger').click().end()
                        .get('.page-container .access-keys-container').should('not.contain', accessKeyID);
                });

        });

        it('Ensure logged in, visit profile page, edit last name 2x.', function(){

            cy.login4DN({ 'email' : 'ud4dntest@gmail.com', 'useEnvToken' : false }).end().get('ul.navbar-acct li.user-account-item').should('have.class', 'is-logged-in').then((accountListItem)=>{
                expect(accountListItem.children('#user_actions_dropdown').text()).to.contain('Frontend');
            }).end()
                .get("#user_actions_dropdown").click().wait(100).end()
                .get('ul.dropdown-menu[aria-labelledby="user_actions_dropdown"] a#profile').click().end()
                .get('.page-container .user-title-row-container h1.user-title').invoke('text').should('include', "Frontend").end() // Test only for first name as we're editing last name & it may change re: delayed indexing, etc.
                // Edit last name
                .get('.page-container .user-title-row-container h1.user-title .last_name .value.saved a.edit-button').click().end()
                .get('.page-container .user-title-row-container h1.user-title .last_name .value.editing input').clear().type('SuperTest').then((inputfield)=>{
                    return cy.wait(100).screenshot().get('.page-container .user-title-row-container h1.user-title .last_name .value.editing .save-button').click()
                        .should('have.length', 0).wait(100).end()
                        .get('.page-container .user-title-row-container h1.user-title').should('have.text', "Frontend SuperTest").end()
                        .url().then((currUrl)=>{ // After reloading on datastore=database, last name stays edited. Then change back.
                            return cy.visit(currUrl + '?datastore=database').end()
                                .get('.page-container .user-title-row-container h1.user-title').should('have.text', "Frontend SuperTest").end()
                                // Cleanup & test again
                                .get('.page-container .user-title-row-container h1.user-title .last_name .value.saved a.edit-button').click().end()
                                .get('.page-container .user-title-row-container h1.user-title .last_name .value.editing input').should('have.value', 'SuperTest').clear().type('Test').then((inputfield)=>{
                                    return cy.wait(100)
                                        .get('.page-container .user-title-row-container h1.user-title .last_name .value.editing .save-button').click()
                                        .should('have.length', 0).wait(100).end()
                                        .get('.page-container .user-title-row-container h1.user-title').should('have.text', "Frontend Test").end()
                                        .reload()
                                        .get('.page-container .user-title-row-container h1.user-title').should('have.text', "Frontend Test").end();
                                });
                        });

                });

        });

    });


});
