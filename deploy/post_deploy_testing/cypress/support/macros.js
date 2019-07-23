
import _ from 'underscore';


export function compareQuickInfoCountsVsBarPlotCounts(options = { 'skipLegend' : false, 'countChildTypes' : false }){

    function getBarCounts(){
        return cy.get('.bar-plot-chart.chart-container .chart-bar .bar-top-label').then(function(labels){
            return _.map(labels, function(l){
                return parseInt(l.innerText);
            });
        });
    }

    function getLegendCounts(){
        return cy.get('.chart-aside > .legend-container > .legend-container-inner .chart-color-legend .term span.text-300').then(function(legendItems){
            return _.map(legendItems, (l) => {
                let legendText = l.innerText.replace('(', '');
                legendText = legendText.replace(')', '');
                legendText = legendText.trim();
                return parseInt(legendText);
            });
        });
    }

    function sum(){
        return _.reduce(arguments, function(m,v){ return m+v; }, 0);
    }

    return cy.getQuickInfoBarCounts().then((quickInfoBarCounts)=>{
        expect(quickInfoBarCounts.experiment_sets).to.be.greaterThan(0);

        // Test ExpSet counts ==
        getBarCounts().then((barCounts)=>{
            expect(sum(...barCounts)).to.equal(quickInfoBarCounts.experiment_sets);
            console.log('barCounts', barCounts);
        });


        if (!options.skipLegend){
            getLegendCounts().then((legendCounts)=>{
                expect(sum(...legendCounts)).to.equal(quickInfoBarCounts.experiment_sets);
            });
        }


        // Hover over all bar parts and count up counts
        var barPartCounts = {
            'experiment_sets' : 0,
            'experiments' : 0,
            'files' : 0
        };

        // Hover in/out to top left navbar logo to reset x/y position of any 'mouse'.
        return cy.get('#top-nav .navbar-main a.navbar-brand').hoverIn().end().wait(1000).then(function(){

            return cy.get('.bar-plot-chart.chart-container .chart-bar:not(.barplot-transition-exit):not(.barplot-transition-exit-active)').each(function($bar){
                return cy.wrap($bar).children('.bar-part').each(($barPart, idx)=>{
                    barPartCounts.experiment_sets += parseInt($barPart.attr('data-count'));
                });
            }).then(()=>{
                expect(barPartCounts.experiment_sets).to.equal(quickInfoBarCounts.experiment_sets);
            });

        })/*.then(()=>{
            expect(hoverCounts.experiment_sets).to.equal(quickInfoBarCounts.experiment_sets);
            expect(hoverCounts.experiments).to.equal(quickInfoBarCounts.experiments);
            expect(hoverCounts.files).to.equal(quickInfoBarCounts.files);
        })*/.end().window().scrollTo('top').end().get('#top-nav .navbar-main a.navbar-brand').hoverIn().wait(300).then(()=>{

                if (!options.countChildTypes) {
                    return cy.window().scrollTo('top').end();
                }


                // Change to 'experiments' (2nd menu item in aggregate type drown); compare bar & legend counts
                return cy.get('button#select-barplot-aggregate-type').should('contain', 'Experiment Sets').click({ 'force' : true }).then(function(){
                    return cy.get('div.dropdown > div.dropdown-menu[aria-labelledby="select-barplot-aggregate-type"] > a.dropdown-item:nth-child(2)')
                        .should('have.text', 'Experiments').click().end().window().scrollTo('top').wait(750).then(function(){
                            return getBarCounts().then((barCounts)=>{
                                expect(sum(...barCounts)).to.equal(quickInfoBarCounts.experiments);
                            }).then(()=>{
                                if (!options.skipLegend){
                                    return getLegendCounts().then((legendCounts)=>{
                                        expect(sum(...legendCounts)).to.equal(quickInfoBarCounts.experiments);
                                    }).end();
                                }
                            }).end().get('.bar-plot-chart.chart-container .chart-bar:not(.barplot-transition-exit):not(.barplot-transition-exit-active)').each(function($bar){
                                return cy.wrap($bar).children('.bar-part').each(($barPart, idx)=>{
                                    barPartCounts.experiments += parseInt($barPart.attr('data-count'));
                                });
                            }).then(()=>{
                                expect(barPartCounts.experiments).to.equal(quickInfoBarCounts.experiments);
                            });
                        }).end();
                // Change to 'files' (2nd menu item in aggregate type drown); compare bar & legend counts
                })/*.get('button#select-barplot-aggregate-type').should('contain', 'Experiments').click({ 'force' : true }).then(()=>{
                    return cy.get('div.dropdown > div.dropdown-menu[aria-labelledby="select-barplot-aggregate-type"] > a.dropdown-item:nth-child(3)')
                        .should('have.text', 'Files').click().end().window().scrollTo('top').wait(750).then(()=>{
                            return getBarCounts().then((barCounts)=>{
                                expect(sum(...barCounts)).to.equal(quickInfoBarCounts.files);
                            }).then(()=>{
                                if (!options.skipLegend){
                                    return getLegendCounts().then((legendCounts)=>{
                                        expect(sum(...legendCounts)).to.equal(quickInfoBarCounts.files);
                                    }).end();
                                }
                            }).end()
                            .get('.bar-plot-chart.chart-container .chart-bar:not(.barplot-transition-exit):not(.barplot-transition-exit-active)').each(($bar)=>{
                                return cy.wrap($bar).children('.bar-part').each(($barPart, idx)=>{
                                    barPartCounts.files += parseInt($barPart.attr('data-count'));
                                });
                            }).then(()=>{
                                expect(barPartCounts.files).to.equal(quickInfoBarCounts.files);
                            });
                        }).end();
            })*/.get('button#select-barplot-aggregate-type').should('contain', /* 'Files' */ 'Experiments').click({ 'force' : true }).then(function(){
                        return cy.get('div.dropdown > div.dropdown-menu[aria-labelledby="select-barplot-aggregate-type"] > a.dropdown-item:nth-child(1)')
                            .should('have.text', 'Experiment Sets').click().end().window().scrollTo('top').wait(750).then(function(){
                                return getBarCounts().then((barCounts)=>{
                                    expect(sum(...barCounts)).to.equal(quickInfoBarCounts.experiment_sets);
                                }).then(()=>{
                                    if (!options.skipLegend){
                                        return getLegendCounts().then((legendCounts)=>{
                                            expect(sum(...legendCounts)).to.equal(quickInfoBarCounts.experiment_sets);
                                        }).end();
                                    }
                                }).end();
                            }).end();

                    }).window().scrollTo('top').end();

            });


    });
}



export function testGraphTabClick(){

    it("Has functional 'graph' tab which is loaded & clickable.", function(){
        cy.get('.item-page-container .rc-tabs .rc-tabs-nav').within(($tabNav)=>{
            cy.contains('Provenance').should('have.length', 1).then(($tabInnerElem)=>{
                const $tab = $tabInnerElem.closest('.rc-tabs-tab');
                return cy.wrap($tab).should('not.have.class', 'rc-tabs-tab-disabled').end()
                    .wrap($tabInnerElem).click().wait(200).end();
            });
        }).end();
    });

}



export function testNodesTextGlobalInputs(listOfNodeTextNames){
    return testNodesText(listOfNodeTextNames, '.graph-wrapper .nodes-layer .node[data-node-type="input"][data-node-global="true"]');
}



export function testNodesText(listOfNodeTextNames, nodesListSelector = '.graph-wrapper .nodes-layer .node'){

    it('Has ' + listOfNodeTextNames.length + '+ global input nodes - starting with ' + listOfNodeTextNames[0], function(){
        cy.get(nodesListSelector).should('have.length.gte', listOfNodeTextNames.length).then(($nodes)=>{
            var already_encountered_accessions = [];
            Cypress._.forEach($nodes, function(n, idx){
                var nodeText = Cypress.$(n).find('.node-name').text();
                expect(nodeText).to.be.oneOf(listOfNodeTextNames);
                expect(nodeText).to.not.be.oneOf(already_encountered_accessions);
                already_encountered_accessions.push(nodeText);
            });
        });
    });

}



/** COPIED FROM SHARED COMPONENTS REPO **/


/** Converts e.g. "/profiles/File.json" to "File" */
function stripTypeFromProfilesHref(profilesHref){
    return profilesHref.slice(10,-5);
}

// This is from '@hms-dbmi-bgm/shared-portal-components/src/components/util/schema-transforms', we redefine here
// to avoid installing/compiling dependency in full.
export function schemasToItemTypeHierarchy(schemas){
    const allTypesArray = _.keys(schemas);
    const resHierarchy = {};

    // We don't get "Item" delivered from backend else would look for where
    // lack of "rdfs:subClassOf" property value to find Item and make that root.
    // Instead we look for where "Item" is parent to gather root schemas.
    const [ rootTypeNames, remainingTypeNames ] = _.partition(allTypesArray, function(typeName){
        const typeSchema = schemas[typeName];
        if (typeSchema["rdfs:subClassOf"] === "/profiles/Item.json"){
            return true;
        }
        return false;
    });

    function addChildrenRecursively(parentHier, parentTypeSchema){
        _.forEach(parentTypeSchema.children || [], function(childTypeURI){
            const childTypeName = stripTypeFromProfilesHref(childTypeURI);
            parentHier[childTypeName] = {};
            const childTypeSchema = schemas[childTypeName];
            if (Array.isArray(childTypeSchema.children) && childTypeSchema.children.length > 0){
                addChildrenRecursively(parentHier[childTypeName], childTypeSchema);
            }
        });
    }

    _.forEach(rootTypeNames, function(rootTypeName){
        resHierarchy[rootTypeName] = {};

        // We have 'children' property in schemas, so we just use these
        // for a performance improvement. See below incomplete fxn for alternative
        // implementation relying purely on rds:subClassOf.
        const rootTypeSchema = schemas[rootTypeName];
        const rootTypeHasChildren = Array.isArray(rootTypeSchema.children) && rootTypeSchema.children.length > 0;
        if (rootTypeHasChildren){
            addChildrenRecursively(resHierarchy[rootTypeName], rootTypeSchema);
        } else {
            // Cull top-level types to only contain types with children.
            delete resHierarchy[rootTypeName];
        }
    });

    /*
    function findParentHierarchyObj(hier, typeName){ // Basic DFS
        const hierKeys = _.keys(hier);
        const hierKeyLen = hierKeys.length;
        var i, currType, found;
        for (i = 0; i < hierKeyLen; i++){
            currType = hierKeys[i];
            if (currType === typeName){
                return hier[currType];
            }
            found = findParentHierarchyObj(hier[currType], typeName);
            if (found){
                return found;
            }
        }
        return false; // Could also throw Err
    }
    */

    /* rds:subClassOf implementation (incomplete)
       TODO: handle parentHier not being found because parent not yet added (ordering)
       Could do by making remainingTypeNames into priority queue of some sort or w. multiple iterations of this for-loop.
    _.forEach(remainingTypeNames, function(typeName){
        const typeSchema = schemas[typeName];
        const parentTypeName = stripTypeFromProfilesHref(typeSchema["rdfs:subClassOf"]);
        const parentHier = findParentHierarchyObj(resHierarchy, parentTypeName);
        parentHier[typeName] = {};
    });
    */

    return resHierarchy;
}

