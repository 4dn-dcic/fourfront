
import { navUserAcctDropdownBtnSelector } from './../support/variables';

describe('Search As You Type functionality on SubmissionView', function () {
    var testItemsToDelete = [];
    let principalObject;

    context('Test Biosource Item Edit page (Enums Only)', function() {
        // Test non-array enums

        beforeEach(function() {
            // Navigate to and create a new Biosample item for testing suggested_enums
            cy.visit('/search/?type=Biosource&currentAction=add', { 'failOnStatusCode': false })
                .login4DN({ 'email': 'u4dntestcypress@gmail.com' }).end()
                .get(navUserAcctDropdownBtnSelector).then((accountListItem)=>{
                    expect(accountListItem.text()).to.contain('Cypress');
                }).end();

            // Generate an identifier and use that for alias
            principalObject = ("sv-sayt-test-" + new Date().getTime());
            cy.get('.modal-dialog input#aliasInput.form-control').focus().type(principalObject)
                .should("have.value", principalObject).end()
                .get("button.btn-primary.btn").should('contain', 'Submit').click().end();
        });

        it('Can select enum from dropdown ', function() {
            // Select last item from dropdown
            cy.get(".field-row[data-field-name=biosource_type] .dropdown-toggle")
                .should('contain', "No value").click()
                .get(".field-row[data-field-name=biosource_type] .search-selection-menu-body .scroll-items .dropdown-item")
                .should('have.length', 8).first().click().end();

            // Check that value in button has changed appropriately
            cy.get(".field-row[data-field-name=biosource_type] .dropdown-toggle")
                .should('contain', "primary cell");
        });

        it('Can select enum via search to type ', function() {
            cy.get(".field-row[data-field-name=biosource_type] .dropdown-toggle").click()
                // Attempt to make a selection that is not in the enumerated list
                .get(".field-row[data-field-name=biosource_type] .search-selection-menu-body .text-input-container input.form-control")
                .focus().type("test")
                // Check that UI indicates new item is NOT being added
                .get(".field-row[data-field-name=biosource_type] .search-selection-menu-body .scroll-items em")
                .should('contain', "No results found")
                // Check the value of the button to make sure value wasn't changed
                .get(".field-row[data-field-name=biosource_type] .dropdown-toggle")
                .should('not.contain', 'test')
                // Clear and begin typing actual suggestion
                .get(".field-row[data-field-name=biosource_type] .search-selection-menu-body .text-input-container input.form-control")
                .clear() // Post-clear re-get to prevent "Detached from DOM errors"
                .get(".field-row[data-field-name=biosource_type] .search-selection-menu-body .text-input-container input.form-control")
                .type("stem")
                // Check that correct number of options appears, and select the first: "stem cell"
                .get(".field-row[data-field-name=biosource_type] .search-selection-menu-body .scroll-items .dropdown-item")
                .should('have.length', 3).first().click()
                // Ensure that the item has been selected
                .get(".field-row[data-field-name=biosource_type] .dropdown-toggle")
                .should('contain', 'stem cell').end();
        });

        it('Can delete enum value', function() {
            cy.get(".field-row[data-field-name=biosource_type] .dropdown-toggle")
                .should('contain', 'No value').click()
                .get(".field-row[data-field-name=biosource_type] .search-selection-menu-body .scroll-items .dropdown-item")
                .should('have.length', 8).first().click()
                .get(".field-row[data-field-name=biosource_type] .dropdown-toggle")
                .should('contain', 'primary cell')
                // Try deleting
                .get(".field-row[data-field-name=biosource_type] .remove-button-column:not(.hidden) button").last().click()
                // Check that value was cleared
                .get(".field-row[data-field-name=biosource_type] .dropdown-toggle")
                .should("contain", "No value").click().end();
        });
    });

    context('Test Software Item Edit page (Suggested Enums)', function() {
        // Test array suggested_enums

        beforeEach(function() {
            // Navigate to and create a new Biosample item for testing suggested_enums
            cy.visit('/search/?type=Software&currentAction=add', { 'failOnStatusCode': false })
                .login4DN({ 'email': 'u4dntestcypress@gmail.com' }).end()
                .get(navUserAcctDropdownBtnSelector).then((accountListItem)=>{
                    expect(accountListItem.text()).to.contain('Cypress');
                }).end();

            // Generate an identifier and use that for alias
            principalObject = ("sv-sayt-test-" + new Date().getTime());
            cy.get('.modal-dialog input#aliasInput.form-control').focus().type(principalObject)
                .should("have.value", principalObject).end()
                .get("button.btn-primary.btn").should('contain', 'Submit').click().end();
        });

        it('Can select from suggested_enum dropdown', function() {
            // Dropdown for suggested_enum should initialize to no value
            cy.get(".field-row [data-field-name=software_type] .dropdown-toggle")
                .should('contain', 'No value').click()
                // Test type to search
                .get(".field-row [data-field-name=software_type] .search-selection-menu-body .text-input-container input.form-control")
                .focus().type('ad')
                // Should be two letters in the button
                .get(".field-row [data-field-name=software_type] .field-column:not(.last-item-empty) .dropdown-toggle")
                .should('contain', 'ad')
                // Should be only one result: "adapter remover"; click it to select from drop
                .get(".field-row [data-field-name=software_type] .search-selection-menu-body .scroll-items .dropdown-item")
                .should('have.length', 1).click()
                // "Adapter remover" should now be present in the button
                .get(".field-row [data-field-name=software_type] .field-column:not(.last-item-empty) .dropdown-toggle")
                .should('contain', 'adapter remover')
                // Check that there is an empty dropdown button in the same field-row
                .get(".field-row [data-field-name=software_type] .last-item-empty .dropdown-toggle")
                .should('contain', "No value").end();
        });

        it('Can add new non-suggested value via search to type', function() {
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
                // Check that UI reflects that new item is being added
                .get(".field-row [data-field-name=software_type] .search-selection-menu-body .scroll-items em")
                .should('contain', "Adding new entry")
                // Finish typing new item name and click off
                .get(".field-row [data-field-name=software_type] .search-selection-menu-body .text-input-container input.form-control")
                .focus().type("ator")
                // Check that new value has been added to the button
                .get(".field-row [data-field-name=software_type] .field-column:not(.last-item-empty) .dropdown-toggle")
                .last().should('contain', 'variant aggregator').end();
        });

        it('Can delete suggested_enum value', function() {
            cy.get(".field-row [data-field-name=software_type] .dropdown-toggle").last()
                .should('contain', 'No value').click()
                .get(".field-row [data-field-name=software_type] .search-selection-menu-body .scroll-items .dropdown-item")
                .should('not.have.length', 0).first().click()
                .get(".field-row [data-field-name=software_type] .dropdown-toggle")
                .should('contain', 'adapter remover')
                // Try deleting
                .get(".field-row[data-field-name=software_type] .remove-button-column:not(.hidden) button").last().click()
                // Check that value was cleared
                .get(".field-row[data-field-name=software_type] .dropdown-toggle")
                .should("contain", "No value").click().end();
        });
    });

    // context('Test Biosample Item Edit page (Linked Objects)', function() {
    //     beforeEach(function() {
    //         // Navigate to and create a new Biosample item for testing suggested_enums
    //         cy.visit('/search/?type=Biosample&currentAction=add', { 'failOnStatusCode': false })
    //             .login4DN({ 'email': 'u4dntestcypress@gmail.com' }).end()
    //             .get(navUserAcctDropdownBtnSelector).then((accountListItem)=>{
    //                 expect(accountListItem.text()).to.contain('Cypress');
    //             }).end();

    //         // Generate an identifier and use that for alias
    //         principalObject = ("sv-sayt-test-" + new Date().getTime());
    //         cy.get('.modal-dialog input#aliasInput.form-control').focus().type(principalObject).wait(100).end()
    //             .get("button.btn-primary.btn").should('contain', 'Submit').click().end().wait(5000);
    //     });

   // it("Can link and object via SearchAsYouTypeAjax ", function() {

        //     });
    
        //     it("Can link an object via Advanced Search ", function() {
    
        //     });
    
        //     it("Can link multiple objects via Advanced Search ", function() {
    
        //     });
    
        //     it("Can delete objects found via SearchAsYouType", function() {
    
        //     });
    
        //     it("Can delete objects found via Advanced Search ", function() {
    
        //     });
        // });

    //     it('Can select enum via search to type ', function() {
    //         // Attempt to make a selection that is not in the enumerated list
    //         cy.get(".field-row[data-field-name=status] .dropdown-toggle").click()
    //             .get(".field-row[data-field-name=status] .search-selection-menu-body .text-input-container input.form-control")
    //             .focus().type("Currently")
    //             // Check that UI indicates new item is NOT being added
    //             .get(".field-row[data-field-name=status] .search-selection-menu-body .scroll-items em")
    //             .should('contain', "No results found")
    //             // Check the value of the button to make sure value wasn't changed there
    //             .get(".field-row[data-field-name=status] .dropdown-toggle")
    //             .should('not.contain', 'Currently').end();
    //     });

    // });
});

        // it('should work with suggested_enums and enums', function() {
        //     const identifier = ("sv-sayt-test-" + new Date().getTime());

        //     // Create a new biosource item for testing enums
        //     cy.get('.field-row [data-field-name=biosource] .linked-object-buttons-container .create-new-obj').click()
        //         // Create an alias for this item
        //         .get('.modal-dialog input#aliasInput.form-control').focus().type(identifier).should('have.value', identifier).end()
        //         .get("button.btn-primary.btn").should('contain', 'Submit').click()
        //         // Check for successful switch (subtitle should change to Biosource)
        //         .get('.depth-level-1.last-title .working-subtitle').should("contain", "Biosource").end();

        //         it('Can select enum from dropdown ', function() {
        //     // Select last item from dropdown
        //     cy.get(".field-row[data-field-name=status] .dropdown-toggle")
        //         .should('contain', "No value").click().wait(1500)
        //         .get(".field-row[data-field-name=status] .search-selection-menu-body .scroll-items .dropdown-item")
        //         .first().click().end();

        //     // Check that new value has been added to the button
        //     cy.get(".field-row[data-field-name=status] .dropdown-toggle")
        //         .should('contain', 'released').end();
        // });

        // it('Can select enum via search to type ', function() {
        //     // Attempt to make a selection that is not in the enumerated list
        //     cy.get(".field-row[data-field-name=status] .dropdown-toggle").click()
        //         .get(".field-row[data-field-name=status] .search-selection-menu-body .text-input-container input.form-control")
        //         .focus().type("Currently")
        //         // Check that UI indicates new item is NOT being added
        //         .get(".field-row[data-field-name=status] .search-selection-menu-body .scroll-items em")
        //         .should('contain', "No results found")
        //         // Check the value of the button to make sure value wasn't changed there
        //         .get(".field-row[data-field-name=status] .dropdown-toggle")
        //         .should('not.contain', 'Currently').end();

            
        // });

    //     it('allows add new non-suggested value via search to type', function() {
    //         // Check that there is an empty dropdown button in the same field-row

    //         const button = Cypress.$('.field-row [data-field-name=Biosource] .last-item-empty .dropdown-toggle');
    //         // .last-item-empty class is applied only if there are >1 items; will be false if running ONLY this single test
    //         if (button.length) {
    //             cy.get(".field-row [data-field-name=Biosource] .last-item-empty .dropdown-toggle")
    //                 .should('contain', "No value").focus().click().end();
    //         } else {
    //             cy.get(".field-row [data-field-name=Biosource] .dropdown-toggle")
    //                 .should('contain', "No value").focus().click().end();
    //         }

    //         // Select it and start typing a suggestion that isn't in the list
    //         cy.get(".field-row [data-field-name=Biosource] .search-selection-menu-body .text-input-container input.form-control")
    //             .focus().type("variant aggreg")
    //             // Check that dropdown items are empty
    //             .get(".field-row [data-field-name=Biosource] .search-selection-menu-body .scroll-items .dropdown-item")
    //             .should('have.length', 0)
    //             // Check that UI reflects that new item is being "added"
    //             .get(".field-row [data-field-name=Biosource] .search-selection-menu-body .scroll-items em")
    //             .should('contain', "Adding new entry")
    //             // Finish typing new item name and click off
    //             .get(".field-row [data-field-name=Biosource] .search-selection-menu-body .text-input-container input.form-control")
    //             .focus().type("ator")
    //             .end();

    //         // Check that new value has been added to the button
    //         cy.get(".field-row [data-field-name=Biosource] .field-column:not(.last-item-empty) .dropdown-toggle").last()
    //             .should('contain', 'variant aggregator').end();
    //     });

    

    //         // Make a new selection "current" by typing
    //         cy.get(".field-row[data-field-name=status] .search-selection-menu-body .text-input-container input.form-control")
    //             // Note: Superfluous get commands used to fix a bug due to this input somehow "detaching from the DOM"; suggestion
    //             // was to re-query in multiple places.
    //             .focus().clear()
    //             .get(".field-row[data-field-name=status] .search-selection-menu-body .text-input-container input.form-control")
    //             .type("current").wait(1000)
    //             .get(".field-row[data-field-name=status] .search-selection-menu-body .scroll-items .dropdown-item")
    //             .should('have.length', 1).click().end();

    //         // Test deleting an item
    //         cy.get(".field-row[data-field-name=status] .remove-button-container button")
    //             .click()
    //             .get(".field-row[data-field-name=status] .dropdown-toggle")
    //             .should("contain", "No value").click().end();

    //         /*
    //         TODO: Fix this test for keyboard navigation -- behaving REALLY strangely
    //         // Load final value and select via arrow key & enter
    //         cy.get(".field-row[data-field-name=status] .search-selection-menu-body .text-input-container input.form-control")
    //             .focus().clear() // Note: again, double querying a result of 'detachment from DOM' post-clear
    //             .get(".field-row[data-field-name=status] .search-selection-menu-body .text-input-container input.form-control")
    //             .type("released")
    //             .get(".field-row[data-field-name=status] .search-selection-menu-body .scroll-items .dropdown-item")
    //             .should('have.length', 2).first().focus()
    //             .trigger('keydown', { keyCode: '9' })
    //             .trigger('keydown', { keyCode: '13' })
    //             // Check that new value has been added to the button
    //             .get(".field-row[data-field-name=status] .dropdown-toggle")
    //             .should('contain', 'released').end();
    //         */
    //     });

    //     it('Can validate and submit software items', function() {
    //         // Try to validate and submit the form.
    //         cy.get(".action-buttons-container .btn").within(function () {
    //             return cy.contains('Validate').click().end().wait(5000);
    //         }).end()
    //             // Click Submit button
    //             .get(".action-buttons-container .btn").within(function () {
    //                 return cy.contains('Submit').click().end().wait(5000);
    //             }).end()
    //             // Navigate new biosample data page
    //             .get(".action-buttons-container .btn").within(function () {
    //                 return cy.contains('Skip').click().end().wait(1000);
    //             }).end();

    //         cy.get('script[data-prop-name=context]').then(($context) => {
    //             const context = $context.text();
    //             const contextData = JSON.parse(context);
    //             const atId = contextData['@id'];
    //             testItemsToDelete.push(atId); // Test software data @id
    //         });
    //     });

    //     it('Properly deletes software items', function() {
    //         // Log in _as admin_.
    //         cy.visit('/').login4DN({ 'email': '4dndcic@gmail.com', 'useEnvToken': true }).wait(500);

    //         // Delete item biosample data.
    //         cy.wrap(testItemsToDelete).each(function (testItem) { // Synchronously process async stuff.
    //             cy.window().then(function (w) {
    //                 const token = w.fourfront.JWT.get();
    //                 cy.request({
    //                     method: "DELETE",
    //                     url: testItem,
    //                     headers: {
    //                         'Authorization': 'Bearer ' + token,
    //                         "Content-Type": "application/json",
    //                         "Accept": "application/json"
    //                     }
    //                 }).end().request({
    //                     method: "PATCH",
    //                     url: testItem,
    //                     headers: {
    //                         'Authorization': 'Bearer ' + token,
    //                         "Content-Type": "application/json",
    //                         "Accept": "application/json"
    //                     },
    //                     body: JSON.stringify({ "tags": ["deleted_by_cypress_test"] })
    //                 });
    //             });
    //         });

    //         // Empty the array for next suite of tests
    //         testItemsToDelete = [];
    //     });
    // });

    // context('Test linked object selection on Software Items', function() {
    //     before(function() {
    //         // Pick option in list for required suggested_enum
    //         cy.get(".field-row [data-field-name=Biosource] .dropdown-toggle")
    //             .should('contain', 'No value').click()
    //             .get(".field-row [data-field-name=Biosource] .search-selection-menu-body .scroll-items .dropdown-item")
    //             .last().click().end();
    //     });

    //     it("Can link and object via SearchAsYouTypeAjax ", function() {

    //     });

    //     it("Can link an object via Advanced Search ", function() {

    //     });

    //     it("Can link multiple objects via Advanced Search ", function() {

    //     });

    //     it("Can delete objects found via SearchAsYouType", function() {

    //     });

    //     it("Can delete objects found via Advanced Search ", function() {

    //     });
    // });
// });