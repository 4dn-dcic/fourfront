'use strict';

import _ from 'underscore';

/**
* Test you can visit the Higlass Display page.
*/
describe("HiGlass Display pages", function(){
    context('Higlass Display summary page', function(){
        it('Can visit HiGlass Display summary page without login', function(){
            // Visit the page and confirm you can see the table and facet properties.
            cy.visit('/higlass-view-configs').wait(100).end()
                .get(".search-headers-column-block span.column-title").should('have.text', ['Title', 'Creator', 'Date Created', 'Date Modified'].join('')).end()
                .get(".facets-header .facets-title").should('have.text', 'Properties');

            // All of the higlass displays you can view should have the "released" status.
            cy.request("/higlass-view-configs/?format=json").then((response)=>{
                const nonReleasedFound = _.some(response.body["@graph"], (higlassViewConf)=>{
                    if (higlassViewConf.status && higlassViewConf.status === "released") {
                        return false;
                    }
                    return true;
                });
                expect(nonReleasedFound).to.not.be.ok;
            });
        });

        it('Can visit HiGlass Display summary page after logging in', function(){
            // Log in, visit the page and look for the create button
            cy.visit('/higlass-view-configs/').login4DN({"options": {'email': 'ud4dntest@gmail.com', 'useEnvToken' : true}}).wait(500).end()
                .get(".create-add-button .btn").should('have.text', 'Create');

            // You should be able to visit the higlass view that is still in "draft" status.
            const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";
            cy.visit(draftUrl);
        });
    });

    context('Edit Individual Higlass display page', function() {
        // Tracks uuids across tests so they can be deleted afterwards.
        let testUuidsToDelete = [];

        beforeEach(function() {
            // Log in.
            cy.visit('/higlass-view-configs/').login4DN({"options": {'email': 'ud4dntest@gmail.com', 'useEnvToken' : true}}).wait(500);
        });

        afterEach(function(){
            if (testUuidsToDelete.length === 0) return;

            // Log in.
            cy.visit('/higlass-view-configs/').login4DN({"options": {'email': 'ud4dntest@gmail.com', 'useEnvToken' : true}}).wait(500);

            // Delete all newly created higlass views.
            _.forEach(testUuidsToDelete, (newUuid) => {
                cy.request("DELETE", newUuid).wait(100);
            });

            // Empty the array now that we're done.
            testUuidsToDelete.length = 0;
        });

        it('Can clone new draft views', function() {
            // Verify logged in users can save higlass displays.

            // Go to the display for the draft display.
            const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";
            cy.visit(draftUrl);

            // Get the raw JSON of the display.
            let originalJson = null;
            cy.request(draftUrl + "?format=json&datastore=database").then((resp)=>{
                originalJson = resp.body;
            });

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

            // Get the raw JSON of the display.
            let originalJson = null;
            cy.request(draftUrl + "?format=json&datastore=database").then((resp)=>{
                originalJson = resp.body;
            });

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
                let newUuid = xhr.responseBody["@graph"][0]["uuid"];
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
        beforeEach(function(){
            cy.visit('/higlass-view-configs/').login4DN({"options": {'email': 'ud4dntest@gmail.com', 'useEnvToken' : true}}).wait(500);

            // Edit the higlass display back to draft status.
            cy.request(
                'PATCH',
                "/higlass-view-configs/00000000-1111-0000-1111-000000000002/",
                {
                    "status":"draft"
                }
            );
        });

        afterEach(function(){
            cy.visit('/higlass-view-configs/').login4DN({"options": {'email': 'ud4dntest@gmail.com', 'useEnvToken' : true}}).wait(500);

            // Edit the higlass display back to draft status.
            cy.request(
                'PATCH',
                "/higlass-view-configs/00000000-1111-0000-1111-000000000002/",
                {
                    "status":"draft"
                }
            );
        });

        it('Can share draft URL', function() {
            // Log in as the sharing user.
            cy.visit('/higlass-view-configs/').login4DN({"options": {'email': 'ud4dntest@gmail.com', 'useEnvToken' : true}}).wait(500);

            // Go to the draft higlass display.
            // Click on the Share button.
            // Wait for the message popup to indicate success.
            const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";
            cy.visit(draftUrl).then(() => {
                cy.get(".inner-panel button.btn-info").click().wait(1000).then(() => {
                    cy.get('.alert div').should('have.text', 'Copied HiGlass URL to clipboard.');

                    // Download the JSON to see if the higlass display is released
                    cy.request(draftUrl + "?format=json&datastore=database").then((newJson)=>{
                        expect(newJson.body.status).to.equal("released");
                    });
                });
            });
        });
    });
});
