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
            cy.request("/higlass-view-configs/?format=json&datastore=database").then((response)=>{
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
            cy.visit('/higlass-view-configs').login4DN().wait(500).end()
                .get(".create-add-button .btn").should('have.text', 'Create');

            // You should be able to see the draft higlass view.
            const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";
            cy.get("a[href='" + draftUrl + "']");
        });
    });

    context('Individual Higlass display page', function() {

        beforeEach(function(){
            // Log in.
            cy.visit('/higlass-view-configs/').login4DN().wait(500);

            // Delete all newly created higlass views.
            const userDisplayTitle = "4dn DCIC";
            cy.request("/higlass-view-configs/?format=json&datastore=database").then((response)=>{

                // Delete the newly created record.
                _.forEach(response.body["@graph"], (higlassViewConf)=>{
                    if (higlassViewConf.submitted_by && higlassViewConf.submitted_by.display_title != userDisplayTitle) {
                        return;
                    }
                    if (['00000000-1111-0000-1111-000000000001', '00000000-1111-0000-1111-000000000002'].indexOf(higlassViewConf.uuid) !== -1) {
                        return;
                    }
                    cy.request("DELETE", higlassViewConf["@id"]).wait(100).then(() => {
                        cy.log(higlassViewConf["@id"]);
                    });
                });
            });
        });
        it('Can clone new draft views', function() {
            // Verify logged in users can save higlass displays.

            // You should be logged in already.
            // Go to the display for the draft display.
            const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";
            cy.get("a[href='" + draftUrl + "']");

            cy.visit(draftUrl);

            // Get the raw JSON of the display.
            let originalJson = null;
            cy.request(draftUrl + "?format=json&datastore=database").then((resp)=>{
                originalJson = resp.body;
            });

            // Click the save as button.
            cy.get('.text-right.inline-block .inline-block:nth-child(2) button.btn.btn-success').click().then(() => {
                // Confirm the underlying JSON of the original has not changed.
                cy.request(draftUrl + "?format=json&datastore=database").then((newJson)=>{
                    const newJsonStr = JSON.stringify(newJson.body);
                    const originalJsonStr = JSON.stringify(originalJson);
                    expect(newJsonStr).to.equal(originalJsonStr);
                });

                // Confirm there is a success message.
                cy.get('.alert div').should('have.text', 'Saved new display.');
            });
        });

        it('Can edit the title and description', function(){
            // Assuming you are already logged in,
            // Go to the display for the view conf display.
            const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";
            cy.get("a[href='" + draftUrl + "']");

            cy.visit(draftUrl);

            // Click Save As to make a new copy.
            cy.get('.text-right.inline-block .inline-block:nth-child(2) button.btn.btn-success').click().wait(10000).then(() => {
                cy.visit("/higlass-view-configs/?datastore=database");
                // Visit the newly created viewconf.
                cy.request("/higlass-view-configs/?format=json&datastore=database").then((response)=>{
                    const newViewConf = _.filter(response.body["@graph"], (higlassViewConf)=>{
                        if (['00000000-1111-0000-1111-000000000001', '00000000-1111-0000-1111-000000000002'].indexOf(higlassViewConf.uuid) !== -1) {
                            return false;
                        }

                        return (higlassViewConf.submitted_by && higlassViewConf.submitted_by.display_title === "4dn DCIC");
                    })[0];

                    cy.visit("/higlass-view-configs/" + newViewConf.uuid);

                    // Click on the edit button and wait for the page load.
                    cy.get(".action-button[data-action='edit'] a").click();

                    // Change the title and description, then save.
                    const newTitle = "Cypress Cool Display";
                    const newDescription = "Look at the description";
                    cy.get("input#field_for_title").clear().type(newTitle).then(() => {
                        cy.get('#field_for_description').clear().type(newDescription).then(() => {
                            // Click validate then click submit
                            cy.get(".action-buttons-container button.btn-info").click().then(() => {
                                cy.get(".action-buttons-container button.btn-success").click().wait(10000).then(() => {
                                    // Once the page reloads, look for the updated title/description
                                    cy.request("/higlass-view-configs/" + newViewConf.uuid + "/?format=json&datastore=database").then((resp)=>{
                                        expect(resp.body.title ).to.equal(newTitle);

                                        expect(resp.body.description ).to.equal(newDescription);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    context('Individual Higlass display page', function() {
        beforeEach(function(){
            // log in.
            const receivingUserEmail = "ud4dntest@gmail.com";
            const userDisplayTitle = "Frontend Test";

            cy.visit('/higlass-view-configs/').login4DN({'email': receivingUserEmail}).wait(500);

            // Delete all newly created higlass views.
            cy.request("/higlass-view-configs/?format=json&datastore=database").then((response)=>{

                // Delete the newly created record.
                _.forEach(response.body["@graph"], (higlassViewConf)=>{
                    if (higlassViewConf.submitted_by && higlassViewConf.submitted_by.display_title != userDisplayTitle) {
                        return;
                    }
                    if (['00000000-1111-0000-1111-000000000001', '00000000-1111-0000-1111-000000000002'].indexOf(higlassViewConf.uuid) !== -1) {
                        return;
                    }
                    cy.request("DELETE", higlassViewConf["@id"]).wait(100).then(() => {
                        cy.log(higlassViewConf["@id"]);
                    });
                });
            });
        });

        it('Can share draft URL', function() {
            // Log in as the sharing user.
            cy.visit('/higlass-view-configs/').login4DN().wait(500);

            // Go to the draft higlass display.
            const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";
            cy.get("a[href='" + draftUrl + "']");

            cy.visit(draftUrl);

            // Click on the Share button.
            // Wait for the message popup to indicate success.
            cy.get(".inner-panel button.btn-info").click().wait(1000)
                cy.get('.alert div').should('have.text', 'Copied HiGlass URL to clipboard.');

            // Download the JSON to see if the higlass display is released
            cy.request(draftUrl + "?format=json&datastore=database").then((newJson)=>{
                expect(newJson.body.status).to.equal("released");
            });
        });
    });
});
