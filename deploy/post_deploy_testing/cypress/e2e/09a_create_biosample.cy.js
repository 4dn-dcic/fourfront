
import { navUserAcctDropdownBtnSelector } from '../support/variables';

/**
* Test you can visit the Biosample create page.
*/
describe('Biosample create page', function () {

    context('Cypress test user profile create biosample page', function () {

        var testItemsToDelete = [];
        it('Main page visit', function () {
            cy.visit('/');
        });

        it('Ensure logged in, visit biosample create page ', function () {

            // Login CypressTest user
            cy.login4DN({ 'email': 'u4dntestcypress@gmail.com', 'useEnvToken': true  }).end()
                .get(navUserAcctDropdownBtnSelector).then((accountListItem) => {
                    expect(accountListItem.text()).to.contain('Cypress');
                }).end();
            cy.visit('/search/?type=Biosample').get(".above-results-table-row .btn").should('contain', 'Create New')
                .get("a.btn.btn-primary.btn").should('contain', 'Create New').click().end()
                .get('.submission-view-modal .modal-title').should('have.text', 'Give your new Biosample an alias');

            // Submit create biosample data name
            const identifier = ("bs-test-" + new Date().getTime());
            cy.get('.modal-dialog input#aliasInput.form-control').focus().type(identifier, { delay: 0 }).end()
                .get("button.btn-primary.btn").should('contain', 'Submit').click().end();

            // Add biosources data file
            cy.get(".field-row[data-field-name=biosource] .dropdown-toggle").click()
                .get(".field-row[data-field-name=biosource] .search-selection-menu-body .text-input-container input.form-control")
                .type("0f011b1e-b772-4f2a-8c24-cc55de28a994")
                .get(".field-row[data-field-name=biosource] .search-selection-menu-body .scroll-items .dropdown-item")
                .should('have.length', 1).click().end();

            // Add deleted_by_cypress_test tag
            cy.get('input#field_for_tags.form-control').focus().type('deleted_by_cypress_test').end();

            // Click Validate button
            cy.get(".action-buttons-container").as("editButtons");
            cy.get("@editButtons").find('button.btn').contains('Validate').click().end();
            cy.get("@editButtons").find('button.btn').contains('Submit').click().end();
            cy.get("@editButtons").find('button.btn').contains('Skip').click().end();
            cy.get("h1.page-title").should('contain', "Biosample").end(); // Await until are at Biosample page. Then wait 1s to ensure we have new context.

            // Queue for deletion in subsequent test.
            cy.get('script[data-prop-name=context]').then(function($context){
                const context = $context.text();
                const contextData = JSON.parse(context);
                const atId = contextData['@id'];
                if (atId !== '/search/?type=Biosample') {
                    testItemsToDelete.push(atId);//Test biosample data @id
                }
            });

        });


        it('Biosample delete data', function () {

            // Log in _as admin_.
            cy.login4DN({ 'email': 'u4dntestcypress@gmail.com', 'useEnvToken': true });
            // Delete item biosample data.
            cy.wrap(testItemsToDelete).each(function (testItemURL) { // Synchronously process async stuff.
                console.log('DELETING', testItemURL);
                cy.getCookie('jwtToken')
                    .then((cookie) => {
                        const token = cookie.value;
                        cy.request({
                            method: "PATCH",
                            url: testItemURL,
                            headers: {
                                'Authorization': 'Bearer ' + token,
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            body: JSON.stringify({ "tags": ["deleted_by_cypress_test"] })
                        });
                    });
            });

            // Empty the array now that we're done.
            testItemsToDelete = [];
        });
    });
});


