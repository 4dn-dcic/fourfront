import { schemasToItemTypeHierarchy } from './macros';


/**
 * Test each Item view to ensure that there is no page rendering error.
 *
 * We will visit one of each Item type directly via browser as an initial page request,
 * instead of navigating to it via UI, as this would make testing 500 render error simpler.
 * @module
 */



export function createItemPageTestsForItemTypeRange(
    startFraction,
    endFraction,
    itemsPerTypeToCheck = 3,
    skipItemTypes = [
        "MicroscopeConfiguration",
        "TrackingItem",
        // The following are skipped only because there will be no public results for them anyway (and may as well skip extra /search/ request).
        // In future however we could have another list of item type names for which we should authenticate as admin for to check, and move these there.
        "AccessKey",
        "User"
    ]
){

    // Gather up all Item types we have.
    let itemTypeHierarchy = null;
    let typesToCheck = null;


    // In some cases, e.g. 'WorkflowRun', a base type is not abstract but does not have any Items.
    // So we try to avoid visiting same item twice.
    const uniqueIDSet = new Set();

    // Temp holder of @ids + typeName to visit from search.
    const currIDs = [];

    const skipItemTypesObj = skipItemTypes.reduce(function(m, itemTypeName){
        m[itemTypeName] = true;
        return m;
    }, {});

    describe(`Each PUBLIC ItemView Works (most public recent only); range ${startFraction} to ${endFraction}`, function () {

        before(function(){
            cy.visit('/'); // Start at home page
            cy.request('/profiles/?format=json', {
                'method' : "GET",
                'headers' : { 'Content-Type' : "application/json; charset=UTF-8", 'Accept' : "application/json" },
                'followRedirect' : true
            }).then(function(res){
                itemTypeHierarchy = schemasToItemTypeHierarchy(res.body); // itemTypeHierarchy contains subset of Item-types (e.g. only Abstract ones and their children)
                console.log({ 'name' : "Item Type Hierarchy", "message" : itemTypeHierarchy });

                // Iterate over /profiles/ response and collect up any which are leaftypes.
                typesToCheck = Cypress._.keys(res.body).sort().filter(function(typeName){
                    return !skipItemTypesObj[typeName] && !res.body[typeName].isAbstract;
                });

            });
        });

        it("Have an itemTypeHierarchy from /profiles/", function(){
            expect(Cypress._.keys(itemTypeHierarchy).length).to.be.at.least(2);
            Cypress.log({ 'name' : "Item Type Hierarchy", "message" : JSON.stringify(itemTypeHierarchy) });
        });

        it("Can load up list of @ids to check per item type (backend)", function(){
            const allTypesLen = typesToCheck.length;
            const currTypesToTest = typesToCheck.slice(
                // Attempt to correct issues with inaccurate floating point multiplication.
                Math.floor(Math.round((allTypesLen * startFraction) * 100) / 100),
                Math.floor(Math.round((allTypesLen * endFraction) * 100) / 100)
            );

            Cypress.log({ 'name' : "Item Types Being Tested", "message" : currTypesToTest.length + "\n : " + currTypesToTest.join('\n') });

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
                                currIDs.push([ id, itemType ]);
                            }
                        }
                    );
                });
            });
        });

        it("Have loaded list of <= 100 @ids to check (INCREASE LIMIT IF THIS FAILS)", function(){
            expect(currIDs).to.have.length.of.at.lte(100);
            Cypress.log({
                'name' : "# Items to Check ",
                "message" : currIDs.length
            });
        });

        // Chunk up in 10-item-view set tests.

        context("Each most-recent item can be navigated w.o. errors", function(){
            for (let i = 0; i < 10; i++) {
                const idRange = [ i * 10, (i + 1) * 10 ];

                it(`IDs ${idRange[0]} to ${idRange[1]} `, function(){

                    let currPagePath = "/";

                    const currIDsInRange = currIDs.slice(...idRange);
                    if (currIDsInRange.length === 0) {
                        return true;
                    }

                    cy.wrap(currIDsInRange).each(function([ currentAtID, currentItemType ], currentAtIDIndex){

                        cy.log("Visiting " + currentAtID + " -- " + (currentAtIDIndex + 1) + " of " + currIDs.length);

                        // Wait 2sec+ to allow temporarily-disabled tabs like Provenance Graph to load so may be tested as well.
                        // (We could also detect the 'disabled but loading provenance' tab and wait for it to not be disabled instead of just waiting longer.. eh... todo later maybe)
                        const waitExtra = currentItemType.indexOf("File") > -1 || currentItemType.indexOf("Experiment") > -1; // Covers ExpSet also. Probably ExperimentType too tho.. :/

                        cy.window().then(function(w){

                            return new Promise(function(resolve){

                                //cy.visit(currentAtID).wait(1000).end()
                                // Use internal app navigation instead since is faster (no loading for HTML response, CSS, etc.)
                                // Also is neat thing to test I guess. idk. Maybe could do both, 1 w visit and 1 w navigate.
                                w.fourfront.navigate(currentAtID, {}, function(){
                                    cy.location('pathname').should('not.equal', currPagePath)
                                        .then(function(pathName){
                                            currPagePath = pathName;
                                            console.log(currPagePath);
                                        }).wait(waitExtra ? 3000 : 250).end()
                                        .get('h1.page-title').should('not.be.empty').end()
                                        .get('div.rc-tabs span[data-tab-key="details"]').should('contain', 'Details').end()
                                        .get('div.rc-tabs div.rc-tabs-tab[role="tab"]').then(($tabList)=>{
                                            const nonDisabledTabs = $tabList.filter(":not(.rc-tabs-tab-disabled)");
                                            const nonDisabledTabsLen = nonDisabledTabs.length;
                                            expect(nonDisabledTabsLen).to.be.greaterThan(0); // We might have only 1 single 'Details' tab or similar, but it shouldn't be disabled if so.
                                            if (nonDisabledTabsLen < 2) {
                                                // Not multiple (clickable) tabs - skip clicking them.
                                                cy.root().should('not.contain', "client-side error").end();
                                            } else {
                                                let currTabTitle = null;
                                                cy.get("h3.tab-section-title, h4.tab-section-title").first().then(function($tabTitle){
                                                    currTabTitle = $tabTitle.text();
                                                }).end().get('.rc-tabs .rc-tabs-nav div.rc-tabs-tab:not(.rc-tabs-tab-active):not(.rc-tabs-tab-disabled)').each(function($tab){
                                                    const tabKey = $tab.children('span.tab').attr('data-tab-key');
                                                    return cy.wrap($tab).click({ 'force' : true }).end()
                                                        .wait(200)
                                                        .get('.rc-tabs-content .rc-tabs-tabpane-active')
                                                        .should('have.id', "tab:" + tabKey).within(function($tabPanel){
                                                            cy.get("h3.tab-section-title, h4.tab-section-title").first().then(function($tabTitle){
                                                                const nextTabTitle = $tabTitle.text();
                                                                expect(nextTabTitle).to.not.equal(currTabTitle);
                                                                currTabTitle = nextTabTitle;
                                                            });
                                                        }).end()
                                                        .root().should('not.contain', "client-side error")
                                                        .end().then(function(){
                                                            Cypress.log({ 'name' : "Successfully Visited", "message" : currentAtID });
                                                        });
                                                }).end();

                                            }
                                        });
                                    resolve(); // Upon navigation complete.
                                });

                            });

                        });

                    });
                });

            }

        });


    });


}


