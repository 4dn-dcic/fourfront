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

            // You should NOT be able to see the draft higlass view.
            const draftUrl = "/higlass-view-configs/00000000-1111-0000-1111-000000000002/";
            cy.get("a[href='" + draftUrl + "']").should('not.exist');
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
        it('Can clone new draft views', function() {
            // Verify logged in users can save higlass displays.

            // Log in.
            cy.visit('/higlass-view-configs/').login4DN().wait(500);

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

                // Confirm a new record was created.
                cy.request("/higlass-view-configs/?format=json&datastore=database").then((response)=>{

                    // Delete the newly created record.
                    _.forEach(response.body["@graph"], (higlassViewConf)=>{
                        if (higlassViewConf.submitted_by && higlassViewConf.submitted_by.display_title !== "4dn DCIC") {
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
        });
    });
});
