'use strict';

/** Test ExperimentsTable for Replicate Experiment Set */

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


describe('Testing experiments-table.js', function() {
    var React, ExperimentsTable, testExperimentsTable, TestUtils, FetchContext, context, schemas, _, ExperimentsTableWrapper;

    beforeEach(function() {
        React = require('react');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');
        ExperimentsTable = require('../experiments-table').ExperimentsTable;
        context = require('../testdata/experiment_set/replicate_4DNESC5JYZPZ');
        schemas = require('../testdata/schemas');

        ExperimentsTableWrapper = React.createClass({

            getInitialState : function(){
                return {
                    selectedFiles : new Set ([
                        "28dbe808-474d-41fc-aac4-0f3ad036d51a",
                        "5a80104a-9dc1-4168-afb3-574f39e62a5b",
                        "56de517e-b634-4e47-89ab-443c3c35ae0f",
                        "9c7ecb77-8717-4eda-84fc-b77ec927e6af",
                        "bc3243ed-79dd-4209-9465-7c0940e89b99"
                    ])
                };
            },

            render: function() {
                return (
                    <div>
                        <ExperimentsTable
                            experimentArray={context.experiments_in_set}
                            replicateExpsArray={context.replicate_exps}
                            experimentSetType={context.experimentset_type}
                            parentController={this}
                        />
                    </div>
                );
            }
        });

        testExperimentsTable = TestUtils.renderIntoDocument(<ExperimentsTableWrapper/>);

    });

    it('Has proper built-in headers (at least)', function() {
        var checkIfHaveHeaders = ['Experiment Accession', 'Biosample Accession', 'File Accession'].sort(); // Sort b/c indices matter
        
        // Check if built-in header definitions match headers to be checked in rendered table.
        expect(
            _.intersection(
                _.map(
                    ExperimentsTable.builtInHeaders(context.experimentset_type),
                    function(h){ return h.visibleTitle || h.title; }
                ).sort(),
                checkIfHaveHeaders
            )
        ).toEqual(checkIfHaveHeaders);

        // Then ensure they're rendered.
        var headersContainer = TestUtils.findRenderedDOMComponentWithClass(testExperimentsTable, 'expset-headers');
        var headers = headersContainer.children; // == TestUtils.scryRenderedDOMComponentsWithClass(testExperimentsTable, 'heading-block');
        expect(
            _.intersection(
                _.pluck(headers, 'innerHTML').sort(),
                checkIfHaveHeaders
            )
        ).toEqual(checkIfHaveHeaders);
    });

    it('Header columns have width styles which fit available width', function() {
        var headers = TestUtils.scryRenderedDOMComponentsWithClass(testExperimentsTable, 'heading-block');
        var availableWidthForTests = 960; // Defined as a fallback in ExperimentsTable.prototype.updateColumnWidths.
        var orderedHeaderWidths = _.pluck(headers, 'style').map(function(hStyle, i){
            var w = parseInt(hStyle._values.width); 
            if (Number.isNaN(w)) return 120; // Default
            return w;
        });

        var totalHeadersWidth = _.reduce(orderedHeaderWidths, function(m,v,i){ return m+v; }, 0); // Sum of heading block widths.
        // Difference of available space minus sum of heading block widths should be ~ +0-2 (margin of error for remainder).
        expect(availableWidthForTests - totalHeadersWidth).toBeGreaterThan(-0.01);
        expect(availableWidthForTests - totalHeadersWidth).toBeLessThan(2.01);
        // Need to update jest for toBeGreaterThanOrEqual to work. 
    });

    it('All child columns/blocks with matching classNames (col-experiment, etc.), match header block widths', function() {
        var headers = TestUtils.scryRenderedDOMComponentsWithClass(testExperimentsTable, 'heading-block');
        var headerWidths = _.object(
            _.map(headers, function(h, i){
                var w = parseInt(h.style._values.width);
                if (Number.isNaN(w)) w = 120; // Default
                var columnClassName = h.getAttribute('data-column-class');
                return [columnClassName, w];
            })
        ); // Returns { 'biosample' : 201, 'experiment' : 253, ... }

        console.log('Header Block Widths for test:', headerWidths);

        var sBlocks = TestUtils.scryRenderedDOMComponentsWithClass(testExperimentsTable, 's-block');

        sBlocks.map(function(sBlock){
            return _.find(sBlock.children, function(child){
                if (child.className.indexOf('name') > -1 && child.className.indexOf('col-') > -1) return true;
                return false;
            });
        }).filter(function(v){
            if (typeof v === 'undefined') return false;
            return true;
        }).forEach(function(nameColumn){
            var colClassName = _.find(
                nameColumn.className.split(' '),
                function(c) { return c.indexOf('col-') > -1; }
            ).replace('col-', '');
            expect(parseInt(nameColumn.style._values.width)).toEqual(headerWidths[colClassName]); // Test for each
        });

    });

    it('Displays blocks for experiment, file-pairs, & files (at least)', function() {
        var found = {
            'experiment' : false,
            'file' : false,
            'file-pair' : false
        };
        var foundAll = false;

        var sBlocks = TestUtils.scryRenderedDOMComponentsWithClass(testExperimentsTable, 's-block');
        var foundClass;
        for (var i=0; i < sBlocks.length; i++){
            foundClass = _.intersection(sBlocks[i].className.split(' '), Object.keys(found))[0];
            if (typeof foundClass !== 'undefined'){
                if (found[foundClass] === false) {
                    found[foundClass] = 1;
                    if (_.every(_.values(found), function(val){ return val !== false; })){
                        foundAll = true;
                        break;
                    }
                } else {
                    found[foundClass]++;
                }
            }
        }

        expect(foundAll).toBe(true);

    });

    it('Number of experiments & files displayed matches number in test data', function() {
        // Any collapsed s-blocks will still be in DOM but invisible (will be found by scryRenderedDOMComponentsWithClass)
        var sBlocks = TestUtils.scryRenderedDOMComponentsWithClass(testExperimentsTable, 's-block');

        expect(
            sBlocks.filter(function(sBlock){
                return sBlock.className.split(' ').indexOf('experiment') > -1;
            }).length
        ).toEqual(
            context.experiments_in_set.length
        );

        expect(
            sBlocks.filter(function(sBlock){ // Only 'file' s-blocks (no file-pairs, experiments, etc.)
                return sBlock.className.split(' ').indexOf('file') > -1;
            }).length
        ).toEqual(
            ExperimentsTable.funcs.fileCountFromExperiments(context.experiments_in_set)
        );

    });

    it('Selecting a file pair block changes selectedFiles state', function() {

        function getFilePairCheckboxElement(sBlock){
            if (
                sBlock.className.split(' ').indexOf('file-pair') > -1 && 
                sBlock.children[0].className.indexOf('name') !== -1 &&
                sBlock.children[0].children[1].className.indexOf('name-title') !== -1 &&
                sBlock.children[0].children[1].children[0].className.indexOf('checkbox') !== -1 &&
                sBlock.children[0].children[1].children[0].children[0].children[0].getAttribute('type') === 'checkbox'
            ) return sBlock.children[0].children[1].children[0].children[0].children[0];
            // .s-block.file-pair (sBlock) > div.name.col-file-pair > span.name-title > .exp-table-checkbox.checkbox > label > input
            // ToDo change .children[1] to _.find or something (as well as other stuff which might differ by layout/style)
            else return null;
        }

        var sBlocks = TestUtils.scryRenderedDOMComponentsWithClass(testExperimentsTable, 's-block');
        var filePairBlocksWithCheckboxes = sBlocks.filter(function(sBlock){
            return getFilePairCheckboxElement(sBlock) !== null;
        });

        // File pair blocks w checkboxes exist (prerequisite).
        expect(filePairBlocksWithCheckboxes.length).toBeGreaterThan(0); // If this fails, probably check getFilePairCheckboxElement.

        
        function selectedFilePairBlocksFileUUIDs(sBlocks){
            return filePairBlocksWithCheckboxes.filter(function(sBlock){
                return getFilePairCheckboxElement(sBlock).checked === true;
            }).map(function(sBlock){
                return getFilePairCheckboxElement(sBlock).id.split('~').pop();
            });
        }

        // Ensure we have 5 initially selected file pairs in parentController state (from test def beforeEach)
        expect(5).toEqual(testExperimentsTable.state.selectedFiles.size);
        
        // Check that the selected file pairs / files in state match checkboxes that are selected.
        function selectedFilesMatchSelectedCheckboxes(){
            return _.isEqual(
                new Set(selectedFilePairBlocksFileUUIDs(filePairBlocksWithCheckboxes)),
                testExperimentsTable.state.selectedFiles
            );
        }

        function clickRandomFilePairCheckboxes(){
            // Click on 7 random checkboxes (odd number so selectedFiles.size differs after)
            _.sample(filePairBlocksWithCheckboxes, 7).forEach(function(sBlock){
                TestUtils.Simulate.change(
                    getFilePairCheckboxElement(sBlock)
                )
            });
        }

        // Check initially selected files' checkboxes are selected
        expect(selectedFilesMatchSelectedCheckboxes()).toBe(true);

        // Check some checkboxes RANDOMLYish and compare again.
        var originalSelectedFiles = new Set(testExperimentsTable.state.selectedFiles); // copy orig set
        clickRandomFilePairCheckboxes();
        // Ensure our state has changed in response to edits/clicks.
        expect(testExperimentsTable.state.selectedFiles.size).not.toEqual(originalSelectedFiles.size);

        // Make sure checkbox values align with state again... then click and check some more times.
        expect(selectedFilesMatchSelectedCheckboxes()).toBe(true);
        for (var i=0; i < 10; i++){
            clickRandomFilePairCheckboxes();
            expect(selectedFilesMatchSelectedCheckboxes()).toBe(true);
        }

    });


    it('Clicking "Show X More Ys" collapse button works', function() {

        var viewMoreButtons = TestUtils.scryRenderedDOMComponentsWithClass(testExperimentsTable, 'view-more-button');
        var collapsibleSections = TestUtils.scryRenderedDOMComponentsWithClass(testExperimentsTable, 'collapsible-s-block-ext');

        // Every collapsible section collapsed
        expect(_.every(collapsibleSections, function(c){ return c.className.split(' ').indexOf('in') === -1; })).toBe(true);

        _.forEach(viewMoreButtons, function(b){
            TestUtils.Simulate.click(b);
        });

        // Every collapsible section in transition state
        expect(_.every(collapsibleSections, function(c){
            return c.className.split(' ').indexOf('collapsing') > -1;
        })).toBe(true);

        jest.runAllTimers(); // Finish transitions

        // Every collapsible section visible
        expect(_.every(collapsibleSections, function(c){ return c.className.split(' ').indexOf('in') > -1; })).toBe(true);

    });

});
