'use strict';

/**
* Test you can visit the Higlass Display page.
*/
describe("HiGlass Display pages", function(){

    context('Higlass Display summary page', function(){
        it('Can visit HiGlass Display collection page without login', function(){

            // Visit the page and confirm you can see the table and facet properties.
            cy.visit('/higlass-view-configs').wait(100).end()
                .get(".search-headers-column-block span.column-title").should('have.text', ['Title', 'Creator'].join('')).end()
                .get(".facets-header .facets-title").should('have.text', 'Properties');

            // All of the higlass displays you can view should have the "released" status.
            cy.request("/higlass-view-configs/?format=json").then((response)=>{
                const nonReleasedFound = Cypress._.some(response.body["@graph"], (higlassViewConf)=>{
                    if (higlassViewConf.status && higlassViewConf.status === "released") {
                        return false;
                    }
                    return true;
                });
                expect(nonReleasedFound).to.not.be.ok;
            });

        });

        it('Have permission to create new displays & view own drafts', function(){

            // You should be able to visit the higlass view that is still in "draft" status.
            const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";

            // Log in, visit the page and look for the create button to assert ability to create.
            cy.visit('/higlass-view-configs/').login4DN({'email': 'ud4dntest@gmail.com', 'useEnvToken' : true}).wait(500).end()
                .get(".above-results-table-row a.btn.btn-xs span").should('have.text', 'Create');

            cy.visit(draftUrl).end().logout4DN();

        });

    });

    // Being skipped until Foursight is set up to collect & purge any Items created here.
    // We should manually add "tag" : "created_via_cypress_test" or something maybe when we perform edit? Idk
    // Or PATCH/request to it separately right after 'clone' test? Idk
    // Or in the afterEach logic we also patch that maybe?
    // Or in foursight we can find "modified_by" : "ud4dntest@gmail.com" + "status":"deleted" ?
    // Many options... maybe already setup/working ?
    context.skip('Share/Create and Edit Individual Higlass display page', function() {

        // Tracks uuids across tests so they can be deleted afterwards.
        var testUuidsToDelete = [];

        beforeEach(function() {
            // Log in.
            cy.visit('/higlass-view-configs/').login4DN({'email': 'ud4dntest@gmail.com', 'useEnvToken' : true}).wait(500);
        });

        afterEach(function(){
            if (testUuidsToDelete.length === 0) return;

            // Log in.
            cy.visit('/higlass-view-configs/').login4DN({'email': 'ud4dntest@gmail.com', 'useEnvToken' : true}).wait(500);

            // Delete all newly created higlass views.
            Cypress._.forEach(testUuidsToDelete, (newUuid) => {
                cy.request("DELETE", newUuid).wait(100);
            });

            // Empty the array now that we're done.
            testUuidsToDelete = [];
        });

        it('Can clone new draft views', function() {
            // Verify logged in users can save higlass displays.

            // Go to the display for the draft display.
            const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";
            cy.visit(draftUrl);

            // When the app creates a new HiGlass display, we'll capture the JSON of the POST call.
            cy.server();
            cy.route('POST', '/higlass-view-configs/').as('newHiglassDisplay');

            // Click the save as button.
            cy.get('.text-right.inline-block .inline-block:nth-child(2) button.btn.btn-success').click().then(() => {
                // Confirm there is a success message.
                cy.get('.alert div').should('have.text', 'Saved new display.');
            });

            // Inspect POST response.
            cy.get('@newHiglassDisplay').then(function (xhr) {
                // Expect a 201 response.
                expect(xhr.status).to.eq(201);

                // Expect a new uuid.
                expect(xhr.responseBody["@graph"][0]["uuid"]).to.not.equal("00000000-1111-0000-1111-000000000002");

                // Add the test uuid so we can delete it later.
                testUuidsToDelete.push(xhr.responseBody["@graph"][0]["uuid"]);
            });
        });

        it('Can edit the title and description', function() {
            // Verify logged in users can save higlass displays.

            // Go to the display for the draft display.
            const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";
            cy.visit(draftUrl);

            // There will be an AJAX response to a POST for the new Higlass display, so capture it here.
            cy.server();
            cy.route('POST', '/higlass-view-configs/').as('newHiglassDisplay');

            // Click the save as button.
            cy.get('.text-right.inline-block .inline-block:nth-child(2) button.btn.btn-success').click().then(() => {
                // Confirm there is a success message.
                cy.get('.alert div').should('have.text', 'Saved new display.');
            });

            // Inspect the AJAX response so we can capture the new uuid.
            cy.get('@newHiglassDisplay').then(function (xhr) {
                // Expect a 201 response.
                expect(xhr.status).to.eq(201);

                // Expect a new uuid.
                expect(xhr.responseBody["@graph"][0]["uuid"]).to.not.equal("00000000-1111-0000-1111-000000000002");

                // Add the test uuid so we can delete it later.
                testUuidsToDelete.push(xhr.responseBody["@graph"][0]["uuid"]);
                const newUuid = xhr.responseBody["@graph"][0]["uuid"];
                expect(newUuid).to.be.ok;

                // Clicking the SaveAs button should redirect us to the new page
                cy.location('pathname').should('eq', "/higlass-view-configs/" + newUuid + "/");

                // Click on the edit button and wait for the page load.
                cy.get(".action-button[data-action='edit'] a").click();

                // Change the title and description, then save.
                const newTitle = "Cypress Cool Display";
                const newDescription = "Look at the description";

                cy.get("input#field_for_title").clear().type(newTitle).then(() => {
                    cy.get('#field_for_description').clear().type(newDescription).then(() => {
                        // Click validate then click submit
                        cy.get(".action-buttons-container button.btn-info").click().then(() => {
                            cy.get(".action-buttons-container button.btn-success").click().wait(1000).then(() => {
                                // Once the page reloads, look for the updated title/description
                                cy.request("/higlass-view-configs/" + newUuid + "/?format=json&datastore=database").then((resp)=>{
                                    expect(resp.body.title).to.equal(newTitle);
                                    expect(resp.body.description).to.equal(newDescription);
                                });
                            });
                        });
                    });
                });

            });
        });
    });

    context('Sharing on the Individual Higlass display page', function() {

        after(function(){
            // Edit the higlass display back to draft status.
            cy.visit('/higlass-view-configs/').login4DN({'email': 'ud4dntest@gmail.com', 'useEnvToken' : true}).wait(500).end().request(
                'PATCH',
                "/higlass-view-configs/00000000-1111-0000-1111-000000000002/",
                {
                    "status":"draft"
                }
            ).logout4DN();
        });

        it('Can share draft URL', function() {

            // Log in as the sharing user.
            // N.B. Cypress had/has some gotchas/issues in terms of preserving cookies between test, so had previously
            // been attempting to login and out in same test.
            // They might have updated/improved their mechanisms and maybe could refactor code later.
            cy.visit('/higlass-view-configs/').login4DN({'email': 'ud4dntest@gmail.com', 'useEnvToken' : true}).wait(500);

            // Go to the draft higlass display.
            // Click on the Share button.
            // Wait for the message popup to indicate success.
            const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";

            cy.visit(draftUrl).get('.item-view-header .indicator-item.item-status').should('have.text', 'draft').end()
                .get(".tab-section-title button.toggle-open-button").click().wait(500).end()
                .get(".tab-section-title .inner-panel.collapse.in button.btn-info.dropdown-toggle").click().wait(300).end()
                .get(".tab-section-title .inner-panel.collapse.in button.btn-info.dropdown-toggle + ul").within(($ul) => {
                    return cy.contains("Visible by Everyone").click().wait(1000).end();
                }).end()
                .get('.alert div').should('have.text', 'Copied HiGlass URL to clipboard.').end()
                // Download the JSON to see if the higlass display is released
                .request(draftUrl + "?format=json&datastore=database").then((newJson)=>{
                    expect(newJson.body.status).to.equal("released");
                }).logout4DN();
        });
    });
});
