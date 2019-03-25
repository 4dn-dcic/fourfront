
import { itemTypeHierarchy } from './../../../../src/encoded/static/components/util/itemTypeHierarchy';

/**
 * Test each Item view to ensure that there is no page rendering error.
 *
 * We will visit one of each Item type directly via browser as an initial page request,
 * instead of navigating to it via UI, as this would make testing 500 render error simpler.
 */


// Config
const itemsPerTypeToCheck = 2;


// Gather up all Item types we have.
const typesToCheck = Cypress._.reduce(Cypress._.toPairs(itemTypeHierarchy), function(res, [ abstractType, leafTypes ]){
    return res.concat(leafTypes);
}, []);
const typesToCheckLen = typesToCheck.length;


// In some cases, e.g. 'WorkflowRun', a base type is not abstract but does not have any Items.
// So we try to avoid visiting same item twice.
const visitedIDs = new Set();

// Temp holder of @ids to visit from search.
let currIDs = [];


describe('Each Item View Works (most public recent only)', function () {

    Cypress._.forEach(typesToCheck, function(itemType, idx){

        context('Item Type - "' + itemType + '" (' + (idx + 1) + '/' + typesToCheckLen + ')', function(){

            before(function(){

                cy.request({
                    url : "/search/?type=" + itemType + "&limit=" + (itemsPerTypeToCheck * 2),
                    method: "GET",
                    failOnStatusCode : false,
                    headers: {
                        'Content-Type' : "application/json",
                        'Accept' : "application/json"
                    }
                }).then((res)=>{
                    currIDs = Cypress._.filter(
                        Cypress._.map(res.body['@graph'], function(item){ return item['@id']; }),
                        function(id){
                            if (visitedIDs.has(id)) {
                                cy.log('Re-encountered', id);
                                return false;
                            } else {
                                visitedIDs.add(id);
                                return true;
                            }
                        }
                    ).slice(0, itemsPerTypeToCheck);
                });

            });


            Cypress._.forEach(Cypress._.range(itemsPerTypeToCheck), function(index){

                it("Item " + (index + 1) + "/" + itemsPerTypeToCheck + " loads view, has title & details tab.", function(){
                    const currItemID = (currIDs && currIDs.length > index && currIDs[index]) || null;

                    if (!currItemID) {
                        expect("PASS").to.equal("PASS");
                    } else {
                        cy.log("Visiting", currItemID);
                        cy.visit(currItemID).get('h1.page-title').should('not.be.empty').end()
                            .get('div.rc-tabs span[data-tab-key="details"]').should('contain', 'Details');
                    }

                });

                it("Can navigate to each tab without an error", function(){
                    const currItemID = (currIDs && currIDs.length > index && currIDs[index]) || null;

                    if (!currItemID) {
                        cy.log("No more Item(s) to visit for type. Exiting.");
                        expect("PASS").to.equal("PASS");
                    } else {

                        cy.get('.rc-tabs .rc-tabs-nav div.rc-tabs-tab:not(.rc-tabs-tab-active):not(.rc-tabs-tab-disabled)').each(function($tab){
                            var tabKey = $tab.children('span.tab').attr('data-tab-key');
                            return cy.wrap($tab).click().end()
                                .get('.rc-tabs-content .rc-tabs-tabpane-active')
                                .should('have.id', "tab:" + tabKey).end()
                                .root().should('not.contain', "client-side error")
                                .end();
                        });

                    }

                });

            });



        });
    });



});


