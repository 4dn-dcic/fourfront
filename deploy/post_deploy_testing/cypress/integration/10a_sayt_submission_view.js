
import { navUserAcctDropdownBtnSelector } from './../support/variables';

describe('Search As You Type functionality on SubmissionView', function () {
    var testItemsToDelete = [];

    context('Test suggested_enums on Software Items', function() {
        before(function() {
            // Navigate to and create a new software item for testing suggested_enums
            cy.visit('/');
            cy.login4DN({ 'email': 'u4dntestcypress@gmail.com' }).end()
                .get(navUserAcctDropdownBtnSelector).then((accountListItem)=>{
                    expect(accountListItem.text()).to.contain('Cypress');
                }).end();
            cy.visit('/search/?type=Software').get(".above-results-table-row .btn").should('contain', 'Create New')
                .get("a.btn.btn-primary.btn").should('contain', 'Create New').click().end().wait(5000);

            // Generate an identifier and use that for alias
            const identifier = ("sv-sayt-test-" + new Date().getTime());
            cy.get('.modal-dialog input#aliasInput.form-control').focus().type(identifier).wait(100).end()
                .get("button.btn-primary.btn").should('contain', 'Submit').click().end().wait(5000);

            // Fill out required field
            cy.get('#field_for_name').focus().type(identifier).wait(100).end();
        });

        it('allows select from suggested_enum dropdown', function() {
            // Dropdown for suggested_enum should initialize to no value
            cy.get(".field-row [data-field-name=software_type] .dropdown-toggle")
                .should('contain', 'No value').click().end();

            // TODO: Add a means to auto-check what # of enum suggestions should be from; maybe pull from schemas if possible?

            // Test type to search
            cy.get(".field-row [data-field-name=software_type] .search-selection-menu-body .text-input-container input.form-control")
                .focus().type('ad').wait(100).end();

            // Should be two letters in the button
            cy.get(".field-row [data-field-name=software_type] .field-column:not(.last-item-empty) .dropdown-toggle")
                .should('contain', 'ad').end();

            // Should be only one result: "adapter remover"; click it to select from drop
            cy.get(".field-row [data-field-name=software_type] .search-selection-menu-body .scroll-items .dropdown-item")
                .should('have.length', 1).click().end();

            // "Adapter remover" should now be present in the button
            cy.get(".field-row [data-field-name=software_type] .field-column:not(.last-item-empty) .dropdown-toggle")
                .should('contain', 'adapter remover').end();

            // Check that there is an empty dropdown button in the same field-row
            cy.get(".field-row [data-field-name=software_type] .last-item-empty .dropdown-toggle")
                .should('contain', "No value").end();

        });

        it('allows add new non-suggested value via search to type', function() {
            // Check that there is an empty dropdown button in the same field-row

            const button = Cypress.$('.field-row [data-field-name=software_type] .last-item-empty .dropdown-toggle');
            // .last-item-empty class is applied only if there are >1 items; will be false if running ONLY this single test
            if (button.length) {
                cy.get(".field-row [data-field-name=software_type] .last-item-empty .dropdown-toggle")
                    .should('contain', "No value").focus().click().end();
            } else {
                cy.get(".field-row [data-field-name=software_type] .dropdown-toggle")
                    .should('contain', "No value").focus().click().end();
            }

            // Select it and start typing a suggestion that isn't in the list
            cy.get(".field-row [data-field-name=software_type] .search-selection-menu-body .text-input-container input.form-control")
                .focus().type("variant aggreg")
                // Check that dropdown items are empty
                .get(".field-row [data-field-name=software_type] .search-selection-menu-body .scroll-items .dropdown-item")
                .should('have.length', 0)
                // Check that UI reflects that new item is being "added"
                .get(".field-row [data-field-name=software_type] .search-selection-menu-body .scroll-items em")
                .should('contain', "Adding new entry")
                // Finish typing new item name and click off
                .get(".field-row [data-field-name=software_type] .search-selection-menu-body .text-input-container input.form-control")
                .focus().type("ator")
                .end();

            // Check that new value has been added to the button
            cy.get(".field-row [data-field-name=software_type] .field-column:not(.last-item-empty) .dropdown-toggle").last()
                .should('contain', 'variant aggregator').end();
        });

        it('Can validate and submit software items', function() {
            // Try to validate and submit the form.
            cy.get(".action-buttons-container .btn").within(function () {
                return cy.contains('Validate').click().end().wait(1000);
            }).end()
                // Click Submit button
                .get(".action-buttons-container .btn").within(function () {
                    return cy.contains('Submit').click().end().wait(1000);
                }).end()
                // Navigate new biosample data page
                .get(".action-buttons-container .btn").within(function () {
                    return cy.contains('Skip').click().end().wait(1000);
                }).end();

            cy.get('script[data-prop-name=context]').then(($context) => {
                const context = $context.text();
                const contextData = JSON.parse(context);
                const atId = contextData['@id'];
                testItemsToDelete.push(atId);//Test biosample data @id
            });
        });

        it('Properly deletes software items', function() {
            // Log in _as admin_.
            cy.visit('/').login4DN({ 'email': '4dndcic@gmail.com', 'useEnvToken': true }).wait(500);

            // Delete item biosample data.
            cy.wrap(testItemsToDelete).each(function (testItem) { // Synchronously process async stuff.
                cy.window().then(function (w) {
                    const token = w.fourfront.JWT.get();
                    cy.request({
                        method: "DELETE",
                        url: testItem,
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        }
                    }).end().request({
                        method: "PATCH",
                        url: testItem,
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify({ "tags": ["deleted_by_cypress_test"] })
                    });
                });
            });

            // Empty the array for next suite of tests
            testItemsToDelete = [];
        });
    });
});


