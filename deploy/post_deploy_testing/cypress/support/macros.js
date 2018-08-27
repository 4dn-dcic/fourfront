
import _ from 'underscore';


export function compareQuickInfoCountsVsBarPlotCounts(options = { 'skipLegend' : false }){

    function getBarCounts(){
        return cy.get('.bar-plot-chart.chart-container .chart-bar .bar-top-label').then((labels)=>{
            return _.map(labels, (l) => {
                return parseInt(l.innerText);
            });
        });
    }

    function getLegendCounts(){
        return cy.get('.chart-aside > .legend-container > .legend-container-inner .chart-color-legend .term span.text-300').then((legendItems)=>{
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
        var barPartCounts = { 'experiment_sets' : 0, 'experiments' : 0, 'files' : 0 };
        return cy.get('#navbar-icon .navbar-header').hoverIn().end().wait(1000).then(()=>{

            return cy.get('.bar-plot-chart.chart-container .chart-bar').each(($bar)=>{
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
        })*/.end().window().scrollTo('top').end().get('#navbar-icon .navbar-header').hoverIn().wait(300).then(()=>{
            // Change to 'experiments' (2nd menu item in aggregate type drown); compare bar & legend counts
            return cy.get('button#select-barplot-aggregate-type').should('contain', 'Experiment Sets').click({ 'force' : true }).then(()=>{
                return cy.get('div.dropdown > ul.dropdown-menu[aria-labelledby="select-barplot-aggregate-type"] > li:nth-child(2)')
                    .should('have.text', 'Experiments').click().end().window().scrollTo('top').wait(750).then(()=>{
                        return getBarCounts().then((barCounts)=>{
                            expect(sum(...barCounts)).to.equal(quickInfoBarCounts.experiments);
                        }).then(()=>{
                            if (!options.skipLegend){
                                return getLegendCounts().then((legendCounts)=>{
                                    expect(sum(...legendCounts)).to.equal(quickInfoBarCounts.experiments);
                                }).end();
                            }
                        }).end().get('.bar-plot-chart.chart-container .chart-bar').each(($bar)=>{
                            return cy.wrap($bar).children('.bar-part').each(($barPart, idx)=>{
                                barPartCounts.experiments += parseInt($barPart.attr('data-count'));
                            });
                        }).then(()=>{
                            expect(barPartCounts.experiments).to.equal(quickInfoBarCounts.experiments);
                        });
                    }).end();
            // Change to 'files' (2nd menu item in aggregate type drown); compare bar & legend counts
            })/*.get('button#select-barplot-aggregate-type').should('contain', 'Experiments').click({ 'force' : true }).then(()=>{
                return cy.get('div.dropdown > ul.dropdown-menu[aria-labelledby="select-barplot-aggregate-type"] > li:nth-child(3)')
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
                        .get('.bar-plot-chart.chart-container .chart-bar').each(($bar)=>{
                            return cy.wrap($bar).children('.bar-part').each(($barPart, idx)=>{
                                barPartCounts.files += parseInt($barPart.attr('data-count'));
                            });
                        }).then(()=>{
                            expect(barPartCounts.files).to.equal(quickInfoBarCounts.files);
                        });
                    }).end();
            })*/.get('button#select-barplot-aggregate-type').should('contain', /* 'Files' */ 'Experiments').click({ 'force' : true }).then(()=>{
                return cy.get('div.dropdown > ul.dropdown-menu[aria-labelledby="select-barplot-aggregate-type"] > li:nth-child(1)')
                    .should('have.text', 'Experiment Sets').click().end().window().scrollTo('top').wait(750).then(()=>{
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
        cy.get('.tab-view-container .rc-tabs-nav').within(($tabNav)=>{
            cy.contains('Graph').should('have.length', 1).then(($tabInnerElem)=>{
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
