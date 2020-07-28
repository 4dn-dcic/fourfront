import { schemasToItemTypeHierarchy } from './macros';


/**
 * Test each Item view to ensure that there is no page rendering error.
 *
 * We will visit one of each Item type directly via browser as an initial page request,
 * instead of navigating to it via UI, as this would make testing 500 render error simpler.
 * @module
 */



export function createItemPageTestsForItemTypeRange(start, end, itemsPerTypeToCheck = 3){

    // Gather up all Item types we have.
    let itemTypeHierarchy = null;
    let typesToCheck = null;


    // In some cases, e.g. 'WorkflowRun', a base type is not abstract but does not have any Items.
    // So we try to avoid visiting same item twice.
    const uniqueIDSet = new Set();

    // Temp holder of @ids to visit from search.
    const currIDs = [];

    describe(`Each PUBLIC ItemView Works (most public recent only); range ${start} to ${end}`, function () {

        before(function(){
            cy.visit('/'); // Start at home page
            cy.request('/profiles/?format=json', {
                'method' : "GET",
                'headers' : { 'Content-Type' : "application/json; charset=UTF-8", 'Accept' : "application/json" },
                'followRedirect' : true
            }).then(function(res){
                itemTypeHierarchy = schemasToItemTypeHierarchy(res.body);
                console.log({ 'name' : "Item Type Hierarchy", "message" : itemTypeHierarchy });
                // Iterate over /profiles/ response and collect up any which are leaftypes.

                typesToCheck = [];

                function gatherTheData(hier){ // Quick DFS
                    Cypress._.toPairs(hier).forEach(function([ maybeAbstractType, leafTypesObj ]){
                        const leafTypes = Cypress._.keys(leafTypesObj);
                        if (leafTypes.length === 0) {
                            typesToCheck.push(maybeAbstractType); // Not abstract you see. Well, maybe, but probably not.
                        } else {
                            gatherTheData(leafTypesObj); // Recurse!
                        }
                    });
                }

                gatherTheData(itemTypeHierarchy);
                typesToCheck.sort();
            });
        });

        it("Have an itemTypeHierarchy from /profiles/", function(){
            expect(Cypress._.keys(itemTypeHierarchy).length).to.be.at.least(2);
            Cypress.log({ 'name' : "Item Type Hierarchy", "message" : JSON.stringify(itemTypeHierarchy) });
        });

        it("Can load up list of @ids to check per item type (backend)", function(){
            const allTypesLen = typesToCheck.length;
            const currTypesToTest = typesToCheck.slice(Math.floor(allTypesLen * start), Math.floor(allTypesLen * end));

            currTypesToTest.forEach(function(itemType, idx){
                cy.request({
                    url : "/search/?type=" + itemType + "&limit=" + itemsPerTypeToCheck,
                    method: "GET",
                    failOnStatusCode : false,
                    headers: {
                        'Content-Type' : "application/json",
                        'Accept' : "application/json"
                    }
                }).then((res)=>{
                    Cypress._.forEach(
                        Cypress._.map(res.body['@graph'], function(item){ return item['@id']; }),
                        function(id){
                            if (uniqueIDSet.has(id)) {
                                cy.log('Re-encountered', id);
                            } else {
                                uniqueIDSet.add(id);
                                currIDs.push(id);
                            }
                        }
                    );
                });
            });
        });

        it("Have loaded list of @ids to check", function(){
            Cypress.log({ 'name' : "# Items to Check", "message" : currIDs.length });
        });

        it("Each most-recent item can be navigated w.o. errors ", function(){

            let currPagePath = "/";

            cy.wrap(currIDs).each(function(currentAtID, currentAtIDIndex){
                cy.log("Visiting", currentAtID, currentAtIDIndex + " of " + currIDs.length);

                cy.window().then(function(w){

                    return new Promise(function(resolve){

                        //cy.visit(currentAtID).wait(1000).end()
                        w.fourfront.navigate(currentAtID, {}, function(){
                            cy.location('pathname').should('not.equal', currPagePath)
                                .then(function(pathName){
                                    currPagePath = pathName;
                                    console.log(currPagePath);
                                }).wait(150).end()
                                .get('h1.page-title').should('not.be.empty').end()
                                .get('div.rc-tabs span[data-tab-key="details"]').should('contain', 'Details').end()
                                .get('.rc-tabs .rc-tabs-nav div.rc-tabs-tab:not(.rc-tabs-tab-active):not(.rc-tabs-tab-disabled)').each(function($tab){
                                    var tabKey = $tab.children('span.tab').attr('data-tab-key');
                                    return cy.wrap($tab).click({ 'force' : true }).end()
                                        .wait(50)
                                        .get('.rc-tabs-content .rc-tabs-tabpane-active')
                                        .should('have.id', "tab:" + tabKey).end()
                                        .root().should('not.contain', "client-side error")
                                        .end().then(function(){
                                            Cypress.log({ 'name' : "Successfully Visited", "message" : currentAtID });
                                        });
                                }).end();
                            resolve();
                        });

                    });

                });

            });
        });


    });


}


