
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

            /*
            // TODO: Fix this test for keyboard navigation -- behaving REALLY strangely
            // Load final value and select via arrow key & enter
            cy.get(".field-row[data-field-name=status] .search-selection-menu-body .text-input-container input.form-control")
                .focus().clear() // Note: again, double querying a result of 'detachment from DOM' post-clear
                .get(".field-row[data-field-name=status] .search-selection-menu-body .text-input-container input.form-control")
                .type("released")
                .get(".field-row[data-field-name=status] .search-selection-menu-body .scroll-items .dropdown-item")
                .should('have.length', 2).first().focus()
                .trigger('keydown', { keyCode: '9' })
                .trigger('keydown', { keyCode: '13' })
                // Check that new value has been added to the button
                .get(".field-row[data-field-name=status] .dropdown-toggle")
                .should('contain', 'released').end();
             */
        });
    });

    context.only('Test Biosample Item Edit page (Linked Objects)', function() {
        beforeEach(function() {
            // Navigate to and create a new Biosample item for testing suggested_enums
            cy.visit('/search/?type=Biosample&currentAction=add', { 'failOnStatusCode': false })
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

        it("Can link an object via SearchAsYouTypeAjax ", function() {

        });

        it("Can link an object via Advanced Search ", function() {

        });

        it("Can link multiple objects via Advanced Search ", function() {

        });

        it("Can delete objects found via SearchAsYouType", function() {

        });

        it("Can delete objects found via Advanced Search ", function() {

        });

        it.only("Can create and link and object via 'Create New'", function() {
            let identifier = ("sv-sayt-test-" + new Date().getTime());

            // Create a new linked biosource item
            cy.get('.field-row [data-field-name=biosource] .linked-object-buttons-container .create-new-obj').click()
                // Create an alias for this item
                .get('.modal-dialog input#aliasInput.form-control').focus().type(identifier).should('have.value', identifier).end()
                .get("button.btn-primary.btn").should('contain', 'Submit').click()
                // Check for successful switch (subtitle should change to Biosource)
                .get('.depth-level-1.last-title .working-subtitle').should("contain", "Biosource")
                // Make and check selections for required fields
                .get(".field-row[data-field-name=biosource_type] .dropdown-toggle").should("contain", "No value").click()
                .get(".field-row[data-field-name=biosource_type] .search-selection-menu-body .scroll-items .dropdown-item")
                .first().click()
                .get(".field-row[data-field-name=biosource_type] .dropdown-toggle").should("contain", "primary cell").end();

            // Try switching back to the principal object and back again.
            cy.get(".submission-nav-leaf.leaf-depth-0 .inner-title.not-complete").click()
                // Check that header updated
                .get('.depth-level-1.last-title .working-subtitle').should("not.exist")
                // Check that tree updated to reflect new state
                .get('.submission-nav-leaf.leaf-depth-0.active .inner-title.not-complete').should("exist")
                .get('.submission-nav-leaf.leaf-depth-1 .inner-title.validated').should("exist")
                // Switch back via navigation sidebar
                .click()
                .get('.depth-level-1.last-title .working-subtitle').should("contain", "Biosource")
                // Then switch back again via field link
                .get(".submission-nav-leaf.leaf-depth-0 .inner-title.not-complete").click()
                .get('.submission-nav-leaf.leaf-depth-0.active .inner-title.not-complete').should("exist")
                .get('.submission-nav-leaf.leaf-depth-1 .inner-title.validated').should("exist")
                .get(".field-row[data-field-name=biosource] .incomplete-linked-object-display-container a")
                .click().end();

            // Submit the child linked Item (post auto-validate from switching)
            cy.get(".action-buttons-container .btn").within(function() {
                return cy.contains('Submit').should("not.be.disabled").click().should("be.disabled");
            }).end();

            // Check that switch back to primary item has occurred
            cy.get('.depth-level-1.last-title .working-subtitle').should("not.exist")
                // Check that navigation tree has updated
                .get(".submission-nav-leaf.leaf-depth-1:not(.active)")
                .should("contain", "dcic-testing-lab:" + identifier)
                .get(".submission-nav-leaf.leaf-depth-0.active .title-text")
                .should("contain", "dcic-testing-lab:" + principalObject)
                // Add the newly created item to the list of items to get rid of
                .get(".field-row [data-field-name=biosource] .dropdown-toggle").first().should("have.attr", "data-tip")
                .get(".field-row [data-field-name=biosource] .dropdown-toggle").first().invoke('attr', 'data-tip')
                .then((atID) => { console.log("add to delete", atID); testItemsToDelete.push(atID); }).end();

            // Create a new biosource item for testing deletion
            identifier = ("sv-sayt-test-" + new Date().getTime());
            cy.get('.field-row [data-field-name=biosource] .last-item-empty .linked-object-buttons-container .create-new-obj').click()
                // Create an alias for this item
                .get('.modal-dialog input#aliasInput.form-control').focus().type(identifier).should('have.value', identifier).end()
                .get("button.btn-primary.btn").should('contain', 'Submit').click()
                // Check for successful switch (subtitle should change to Biosource)
                .get('.depth-level-1.last-title .working-subtitle').should("contain", "Biosource")
                // Don't make selections for required fields (make auto-validate fail upon switching)
                .get(".submission-nav-leaf.leaf-depth-0 .inner-title.not-complete").click()
                // Check that item is not shown as validated in sidebar
                .get(".submission-nav-leaf.leaf-depth-1.linked-item-title").should("have.length", 2)
                .first().invoke('hasClass', 'failed-validation')
                // Attempt to delete item
                .get('.field-row [data-field-name=biosource] .remove-button-column:not(.hidden) button')
                .last().click()
                // Check that item is removed from sidebar
                .get(".submission-nav-leaf.leaf-depth-1.linked-item-title").should("have.length", 1).end();

            // Submit the principal object
            // Note: Currently fails due to a bug in submission view that needs fixing.
            cy.get(".action-buttons-container .btn").within(function () {
                return cy.contains('Validate').should("not.be.disabled").click().end();
            }).end()
                // Click Submit button
                .get(".action-buttons-container .btn").should("not.be.disabled").within(function () {
                    return cy.contains('Submit').should("not.be.disabled").click().end();
                }).end()
                // Navigate new biosample data page
                .get(".action-buttons-container .btn").within(function () {
                    return cy.contains('Skip').should("not.be.disabled").click().end();
                }).end();

            // Add principal object @ID to delete array
            cy.get('script[data-prop-name=context]').should("exist").then(($context) => {
                const context = $context.text();
                const contextData = JSON.parse(context);
                const atId = contextData['@id'];
                testItemsToDelete.push(atId); // Test software data @id
            });
        });

        it.only('Properly deletes submitted items', function() {
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