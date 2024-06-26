'use strict';

import { higlassItemViewVizSelector } from '../support/variables';

const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";


/**
* Test you can visit the Higlass Display page.
*/
describe("HiGlass Display pages", function(){

    context('Higlass Display summary page', function(){

        // testIsolation that is a part of Cypress 12 migration is breaking the current test execution.
        // Adding "testIsolation: false" into cypress.config.js is the workaround to run tests as it was before, but
        // it is not a complete solution. So, we added beforeEach to clear cookies and local storage as it is descibed in:
        // https://docs.cypress.io/guides/references/migration-guide#Simulating-Pre-Test-Isolation-Behavior
        beforeEach(() => {
            cy.clearLocalStorage();
            cy.clearCookies();
            // other beforeEach logic to restore the expected local storage or cookies needed on the client.
        });

        it('Can visit HiGlass Display collection page without login', function(){

            // Visit the page and confirm you can see the table and facet properties.
            cy.visit('/higlass-view-configs').end()
                .get(".search-headers-column-block .column-title").should('have.text', ['Title', 'Creator'].join('')).end()
                .get(".facets-header .facets-title").should('have.text', 'Included Properties');

            // All of the higlass displays you can view should have the "released" status.
            cy.request({
                'url' : "/higlass-view-configs/?format=json",
                'method' : "GET",
                'headers' : { 'Content-Type' : "application/json; charset=UTF-8" },
                'followRedirect' : true
            }).then((response)=>{
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

            // Log in, visit the page and look for the create button to assert ability to create.
            cy.login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken' : true }).end()
                .get(".above-results-table-row a.btn.btn-xs").should('contain', 'Create');

            cy.visit(draftUrl).end().logout4DN();

        });

    });


    context('Share/Create and Edit Individual Higlass display page', function() {

        // Tracks uuids across tests so they can be deleted afterwards.
        var testItemsToDelete = [];

        beforeEach(function() {
            cy.clearLocalStorage();
            cy.clearCookies();
            // Log in.
            cy.visit('/higlass-view-configs/').login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken' : true }).end();
        });

        after(function(){

            // Maybe we could just delete ALL higlass displays owned by 'ud4dntest@gmail.com'
            // as a more complete cleanup (except like hardcoded 00000000-1111-0000-1111-000000000002)
            // In case some tests fail and terminate before getting to this point of cleanup.

            const testItemsToDeleteIDs = testItemsToDelete.map(function({ '@id' : id }){ return id; });

            Cypress.log({
                'name' : "Deleting Newly-Created HiGlass View Configs Items",
                'message' : "Count: " + testItemsToDelete.length + ", Item IDs: " + testItemsToDeleteIDs.join(", ")
            });

            if (testItemsToDeleteIDs.length === 0) return;

            // Log in _as admin_.
            cy.visit('/higlass-view-configs/').login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken' : true }).end();

            // Delete all newly created higlass views.
            cy.wrap(testItemsToDeleteIDs).each(function(testItemID){ // Synchronously process async stuff.
                cy.getCookie('jwtToken')
                    .then((cookie) => {
                        const token = cookie.value;
                        // cy.request({
                        //     method: "DELETE",
                        //     url: testItemID,
                        //     headers: {
                        //         'Authorization': 'Bearer ' + token,
                        //         "Content-Type" : "application/json",
                        //         "Accept" : "application/json"
                        //     }
                        // }).end().request({
                        cy.request({
                            method: "PATCH",
                            url: testItemID,
                            headers: {
                                'Authorization': 'Bearer ' + token,
                                "Content-Type" : "application/json",
                                "Accept" : "application/json"
                            },
                            body: JSON.stringify({ "tags" : ["deleted_by_cypress_test"] })
                        });
                    });
            });

            // Empty the array now that we're done.
            testItemsToDelete = [];
        });


        it('Can clone new draft views', function() {
            // Verify logged in users can save higlass displays.

            // Go to the display for the draft display.
            cy.visit(draftUrl);

            // When the app creates a new HiGlass display, we'll capture the JSON of the POST call.
            cy.intercept('POST', '/higlass-view-configs/').as('newHiglassDisplay');

            // Ensure HiGlassComponent has loaded (before Clone btn can be clicked w/o errors)
            cy.get('.higlass-instance .react-grid-layout').end()
                // Click the 'Clone' button.
                .get(".tab-section-title .tabview-title-controls-container").within(function($panel){
                    return cy.contains('Clone').click().end();
                }).end()
                .get('.alert div').should('contain.text', 'Saved new display.').end()
                // Inspect POST response.
                .get('@newHiglassDisplay').then(function ({ request, response }) {

                    // Expect a 201 response.
                    expect(response.statusCode).to.eq(201);

                    // Expect a new uuid.
                    expect(response.body["@graph"][0]["uuid"]).to.not.equal("00000000-1111-0000-1111-000000000002");

                    // Add the test Item so we can delete it later.
                    testItemsToDelete.push(response.body["@graph"][0]);
                })
                .end()
                // Wait for HiGlass to fully be initialized as well, to avoid __zoom error perhaps.
                .get(higlassItemViewVizSelector).end();
        });

        it('Can edit the title and description', function() {

            // Change the title and description, then save.
            const newTitle = "Cypress Cool Display";
            const newDescription = "Look at the description";

            // Verify logged in users can save higlass displays.

            // Go to the display for the draft display.
            cy.visit(draftUrl);

            // There will be an AJAX response to a POST for the new Higlass display, so capture it here.
            cy.intercept('POST', '/higlass-view-configs/').as('newHiglassDisplay');

            // Ensure HiGlassComponent has loaded (before Clone btn can be clicked w/o errors)
            cy.get('.higlass-instance .react-grid-layout').end()

                // Click the 'Clone' button.
                .get(".tab-section-title .tabview-title-controls-container").within(function($panel){
                    return cy.contains('Clone').click().end();
                }).end()

                // Confirm there is a success message.
                .get('.alert div').should('contain.text', 'Saved new display.').end()

                // Inspect the AJAX response so we can capture the new uuid.
                .get('@newHiglassDisplay').then(function ({ request, response }) {

                    // Expect a 201 response.
                    expect(response.statusCode).to.eq(201);

                    // Expect a new uuid.
                    expect(response.body["@graph"][0]["uuid"]).to.not.equal("00000000-1111-0000-1111-000000000002");

                    // Add the test uuid so we can delete it later.
                    testItemsToDelete.push(response.body["@graph"][0]);
                    const newID = response.body["@graph"][0]["@id"];
                    expect(newID).to.be.ok;

                    // Clicking the SaveAs button should redirect us to the new page
                    cy.location('pathname')
                        .should('eq', newID).end()
                        // Wait for HiGlass to fully be initialized as well, to avoid __zoom error perhaps.
                        .get(higlassItemViewVizSelector).end()

                        // Click on the edit button and wait for the page load.
                        .get(".action-button[data-action='edit'] a").click({ force: true }).end()
                        .get("input#field_for_title").clear().type(newTitle, { delay: 0 }).end()
                        .get('#field_for_description').clear().type(newDescription, { delay: 0 }).end()
                        .get('input#field_for_tags.form-control').focus().type('deleted_by_cypress_test', { delay: 0 }).end()
                        // Click validate then click submit
                        .get(".action-buttons-container button.btn-info").click().end()
                        .get(".action-buttons-container button.btn-success").click().end()
                        // Wait for HiGlass to fully be initialized as well, to avoid __zoom error perhaps.
                        .get(higlassItemViewVizSelector).end()
                        // Once the page reloads, look for the updated title/description
                        .request({
                            'url' : newID + "?format=json&datastore=database",
                            'method' : "GET",
                            'headers' : { 'Content-Type' : "application/json; charset=UTF-8" },
                            'followRedirect' : true
                        }).then((resp)=>{
                            expect(resp.body.title).to.equal(newTitle);
                            expect(resp.body.description).to.equal(newDescription);
                        }).end();

                });
        });
    });


    context('Sharing on the Individual Higlass display page', function() {

        // https://docs.cypress.io/guides/references/migration-guide#Simulating-Pre-Test-Isolation-Behavior
        beforeEach(() => {
            cy.clearLocalStorage();
            cy.clearCookies();
        });

        after(function(){

            // Edit the higlass display back to draft status.
            cy.visit('/higlass-view-configs/').login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken' : true }).end()
                .getCookie('jwtToken')
                .then((cookie) => {
                    const token = cookie.value;
                    return cy.request({
                        method: "PATCH",
                        url: draftUrl,
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            "Content-Type" : "application/json",
                            "Accept" : "application/json"
                        },
                        body: JSON.stringify({ "status" : "draft" })
                    }).logout4DN();
                });
        });

        it('Can release HiGlass Item to public.', function() {

            // Log in as the sharing user.
            // N.B. Cypress had/has some gotchas/issues in terms of preserving cookies between test, so had previously
            // been attempting to login and out in same test.
            // They might have updated/improved their mechanisms and maybe could refactor code later.
            cy.visit('/higlass-view-configs/').login4DN({ 'email': 'ud4dntest@gmail.com', 'useEnvToken' : true }).end();

            // Go to the draft higlass display.
            // Click on the Share button.
            // Wait for the message popup to indicate success.

            // This also tests the mobile menu as well as the share/release dropdown btn functionality.
            cy.visit(draftUrl).get('.item-view-header .indicator-item.item-status').should('have.text', 'draft').end()
                .get(".tab-section-title .tabview-title-controls-container button.btn-info.dropdown-toggle").click().end()
                .get(".tab-section-title .tabview-title-controls-container button.btn-info.dropdown-toggle + .dropdown-menu.show").within(function($menu){
                    return cy.contains("Visible by Everyone").click().end();
                }).end()
                .get('.alert div').should('contain', 'Changed Display status to released.').end()
                // Wait for HiGlass to fully be initialized as well, to avoid __zoom error perhaps.
                .get(higlassItemViewVizSelector).end()

                // Download the JSON to see if the higlass display is released
                .request(draftUrl + "?format=json&datastore=database").then((newJson)=>{
                    expect(newJson.body.status).to.equal("released");
                }).logout4DN().end();
        });
    });
});
