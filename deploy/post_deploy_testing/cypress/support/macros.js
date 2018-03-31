
import _ from 'underscore';


export function compareQuickInfoCountsVsBarPlotCounts(skipLegend = false){

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

        if (!skipLegend){
            getLegendCounts().then((legendCounts)=>{
                expect(sum(...legendCounts)).to.equal(quickInfoBarCounts.experiment_sets);
            });
        }

        // Hover over all bar parts and count up counts
        var hoverCounts = { 'experiment_sets' : 0, 'experiments' : 0, 'files' : 0 };
        return cy.get('#navbar-icon .navbar-header').hoverIn().wait(1000).end().then(()=>{

            return cy.get('.bar-plot-chart.chart-container .chart-bar').each(($bar)=>{
                return cy.wrap($bar).children('.bar-part').each(($barPart, idx)=>{

                    // TODO: Grab each barPart.attr('data-count'), compare to hover value for expset.

                    return cy.wrap($barPart).hoverIn().wait(500).then(()=>{
                        cy.get('.cursor-component-root .details-title .primary-count').then((expsetCountElem)=>{
                            hoverCounts.experiment_sets += parseInt(expsetCountElem.text());
                        });
                        cy.get('.cursor-component-root .details.row .col-xs-6').then((expsCountElem)=>{
                            hoverCounts.experiments     += parseInt(expsCountElem.text());
                        });
                        return cy.get('.cursor-component-root .details.row .col-xs-4').then((fileCountElem)=>{
                            hoverCounts.files           += parseInt(fileCountElem.text());
                        }).wait(250);
                    });
                });
            });

        }).then(()=>{
            expect(hoverCounts.experiment_sets).to.equal(quickInfoBarCounts.experiment_sets);
            expect(hoverCounts.experiments).to.equal(quickInfoBarCounts.experiments);
            expect(hoverCounts.files).to.equal(quickInfoBarCounts.files);
        }).end().window().scrollTo('top').end().get('#navbar-icon .navbar-header').hoverIn().wait(300).then(()=>{
            // Change to 'experiments' (2nd menu item in aggregate type drown); compare bar & legend counts
            return cy.get('button#select-barplot-aggregate-type').should('contain', 'Experiment Sets').click({ 'force' : true }).then(()=>{
                return cy.get('div.dropdown > ul.dropdown-menu[aria-labelledby="select-barplot-aggregate-type"] > li:nth-child(2)')
                .should('have.text', 'Experiments').click().end().window().scrollTo('top').wait(750).then(()=>{

                    return getBarCounts().then((barCounts)=>{ 
                        expect(sum(...barCounts)).to.equal(quickInfoBarCounts.experiments);
                    }).then(()=>{
                        if (!skipLegend){
                            return getLegendCounts().then((legendCounts)=>{
                                expect(sum(...legendCounts)).to.equal(quickInfoBarCounts.experiments);
                            }).end();
                        }
                    }).end();

                }).end();
            // Change to 'files' (2nd menu item in aggregate type drown); compare bar & legend counts
            }).get('button#select-barplot-aggregate-type').should('contain', 'Experiments').click({ 'force' : true }).then(()=>{
                return cy.get('div.dropdown > ul.dropdown-menu[aria-labelledby="select-barplot-aggregate-type"] > li:nth-child(3)')
                .should('have.text', 'Files').click().end().window().scrollTo('top').wait(750).then(()=>{

                    return getBarCounts().then((barCounts)=>{
                        expect(sum(...barCounts)).to.equal(quickInfoBarCounts.files);
                    }).then(()=>{
                        if (!skipLegend){
                            return getLegendCounts().then((legendCounts)=>{
                                expect(sum(...legendCounts)).to.equal(quickInfoBarCounts.files);
                            }).end();
                        }
                    }).end();

                }).end();
            }).get('button#select-barplot-aggregate-type').should('contain', 'Files').click({ 'force' : true }).then(()=>{
                return cy.get('div.dropdown > ul.dropdown-menu[aria-labelledby="select-barplot-aggregate-type"] > li:nth-child(1)')
                .should('have.text', 'Experiment Sets').click().end().window().scrollTo('top').wait(750).then(()=>{

                    return getBarCounts().then((barCounts)=>{
                        expect(sum(...barCounts)).to.equal(quickInfoBarCounts.experiment_sets);
                    }).then(()=>{
                        if (!skipLegend){
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
