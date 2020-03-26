'use strict';

import React from 'react';
import _ from 'underscore';
import TestUtils from 'react-dom/test-utils';
import { StackedBlockTable } from '@hms-dbmi-bgm/shared-portal-components/es/components/browse/components/StackedBlockTable';
import { RawFilesStackedTable } from './../browse/components/file-tables';
import { SelectedFilesController } from './../browse/components/SelectedFilesController';
import { expFxn } from './../util';

/** Test RawFilesStackedTable for Replicate Experiment Set */

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


describe('Testing RawFilesStackedTable', function() {
    var testRawFilesStackedTable, context, schemas, initiallySelectedFiles;

    beforeAll(function() { // (ran once only)

        context = require('../testdata/experiment_set/replicate_4DNESH4MYRID');
        schemas = require('../testdata/schemas');

        initiallySelectedFiles = {
            "4DNESH4MYRID~4DNEXL6MFLSD~4DNFI4HKT2OG" : true, // Pair 1
            "4DNESH4MYRID~4DNEXL6MFLSD~4DNFI397I6JO" : true,

            "4DNESH4MYRID~4DNEXTBYNI67~4DNFIW6GQC2H" : true, // Pair 2
            "4DNESH4MYRID~4DNEXTBYNI67~4DNFIYJESQV8" : true,

            // These r hidden
            //"4DNESH4MYRID~4DNEX9L8XZ38~4DNFIX7DX8L7" : true, // Pair 3 (there's more, but lets leave unselected)
            //"4DNESH4MYRID~4DNEX9L8XZ38~4DNFIAIZUF8R" : true,
            
            "4DNESH4MYRID~4DNEXYZ7NL1X~4DNFIHI4TVBE" : true, // Pair 6 (visible)
            "4DNESH4MYRID~4DNEXYZ7NL1X~4DNFIBPIIH4C" : true,

            "4DNESH4MYRID~4DNEXWLYHUZX~4DNFIA6D63FT" : true, // Pair 7 (visible)
            "4DNESH4MYRID~4DNEXWLYHUZX~4DNFIDFWAQTK" : true,
            
        };

        class RawFilesStackedTableWrapper extends React.Component {

            constructor(props){
                super(props);
                this.ref = React.createRef();
            }

            render() {
                return (
                    <div>
                        <SelectedFilesController initiallySelectedFiles={initiallySelectedFiles} ref={this.ref}>
                            <RawFilesStackedTable experimentSet={context} width={960} collapseLongLists />
                        </SelectedFilesController>
                    </div>
                );
            }
        }

        testRawFilesStackedTable = TestUtils.renderIntoDocument(<RawFilesStackedTableWrapper/>);

    });

    it('Has proper built-in headers (at least)', function() {
        var checkIfHaveHeaders = ['Experiment', 'Biosample', 'File'].sort(); // Sort b/c indices matter
        
        // Check if built-in header definitions match headers to be checked in rendered table.
        expect(
            _.intersection(
                _.map(
                    RawFilesStackedTable.builtInHeaders(context.experimentset_type),
                    function(h){ return h.visibleTitle || h.title; }
                ).sort(),
                checkIfHaveHeaders
            )
        ).toEqual(checkIfHaveHeaders);

        // Then ensure they're rendered.
        const headersContainer = TestUtils.findRenderedDOMComponentWithClass(testRawFilesStackedTable, 'stacked-block-table-headers');
        const headers = headersContainer.children; // == TestUtils.scryRenderedDOMComponentsWithClass(testRawFilesStackedTable, 'heading-block');

        expect(
            _.intersection(
                _.pluck(headers, 'innerHTML').sort(),
                checkIfHaveHeaders
            )
        ).toEqual(checkIfHaveHeaders);
    });

    it('Header columns have minWidth styles which fit available width', function() {
        const headers = TestUtils.scryRenderedDOMComponentsWithClass(testRawFilesStackedTable, 'heading-block');
        const orderedHeaderWidths = headers.map(function(h, i){
            const w = parseInt(h.style._values['min-width']); 
            if (Number.isNaN(w)){
                return StackedBlockTable.defaultProps.defaultInitialColumnWidth;
            }
            return w;
        });
        const totalHeadersWidth = _.reduce(orderedHeaderWidths, function(m,v,i){ return m+v; }, 0); // Sum of heading block widths.
        expect(totalHeadersWidth).toBeGreaterThan(300);
    });

    it('All child columns/blocks with matching classNames (col-experiment, etc.), match header block widths', function() {
        const headers = TestUtils.scryRenderedDOMComponentsWithClass(testRawFilesStackedTable, 'heading-block');
        const minHeaderWidths = _.map(headers, function(h, i){
            let w = parseInt(h.style._values['min-width']);
            if (Number.isNaN(w)) w = StackedBlockTable.defaultProps.defaultInitialColumnWidth; // Default
            return [ h.getAttribute('data-column-class'), w ];
        })

        console.log('Header Block Widths for test:', minHeaderWidths);

        const sBlocks = TestUtils.scryRenderedDOMComponentsWithClass(testRawFilesStackedTable, 's-block');

        sBlocks.map(function(sBlock){
            return _.find(sBlock.children, function(child){
                if (child.className.indexOf('name') > -1 && child.className.indexOf('col-') > -1) return true;
                return false;
            });
        }).filter(function(v){
            if (typeof v === 'undefined') return false;
            return true;
        }).forEach(function(nameColumn){
            const colClassName = _.find(
                nameColumn.className.split(' '),
                function(c) { return c.indexOf('col-') > -1; }
            ).replace('col-', '');
            expect(
                _.any(minHeaderWidths, function(hw){ return hw[1] === parseInt(nameColumn.style._values['min-width']) && hw[0] === colClassName })
            ).toEqual(true); // Test for each
        });

    });

    it('Displays blocks for experiment, file-pairs, & files (at least)', function() {
        const found = {
            'experiment' : false,
            'file' : false,
            'file-group' : false
        };
        let foundAll = false;

        const sBlocks = TestUtils.scryRenderedDOMComponentsWithClass(testRawFilesStackedTable, 's-block');
        let foundClass;

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
        const sBlocks = TestUtils.scryRenderedDOMComponentsWithClass(testRawFilesStackedTable, 's-block');

        const experimentSBlocks = sBlocks.filter(function(sBlock){
            return sBlock.className.split(' ').indexOf('experiment') > -1;
        });
        const showMoreExpsBtn = TestUtils.findRenderedDOMComponentWithClass(testRawFilesStackedTable, 'view-more-button');

        expect(showMoreExpsBtn.innerHTML.indexOf("3 More Experiments")).toBeGreaterThan(-1);

        expect(
            experimentSBlocks.length + 3
        ).toEqual(
            context.experiments_in_set.length
        );

        const fileSBlocks = sBlocks.filter(function(sBlock){ // Only 'file' s-blocks (no file-pairs, experiments, etc.)
            return sBlock.className.split(' ').indexOf('file') > -1;
        });

        expect(fileSBlocks.length).toBeGreaterThanOrEqual(experimentSBlocks.length * 2);
        
        expect(fileSBlocks.length).toBeLessThanOrEqual(
            expFxn.fileCountFromExperiments(context.experiments_in_set, false, false)
        );

    });

    it('Clicking "Show X More Ys" collapse button works', function() {

        const viewMoreButtons = TestUtils.scryRenderedDOMComponentsWithClass(testRawFilesStackedTable, 'view-more-button');
        const collapsibleSections = TestUtils.scryRenderedDOMComponentsWithClass(testRawFilesStackedTable, 'collapsible-s-block-ext');
        const countSBlocksOrig = TestUtils.scryRenderedDOMComponentsWithClass(testRawFilesStackedTable, 's-block').length;

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

        const countSBlocksNew = TestUtils.scryRenderedDOMComponentsWithClass(testRawFilesStackedTable, 's-block').length;
        expect(countSBlocksNew).toBeGreaterThan(countSBlocksOrig);
    });

    it('Selecting a file pair block changes selectedFiles state', function() {

        function getFilePairCheckboxElement(sBlock){
            if (
                sBlock.className.split(' ').indexOf('file-group') > -1 &&
                sBlock.children[0].className.indexOf('name') !== -1 &&
                sBlock.children[0].children[1].className.indexOf('name-title') !== -1 &&
                sBlock.children[0].children[1].children[0].className.indexOf('multiple-files-checkbox-wrapper') !== -1 &&
                sBlock.children[0].children[1].children[0].children[0].getAttribute('type') === 'checkbox'
            ){
                return sBlock.children[0].children[1].children[0].children[0];
            }
            //console.log("NOT FOUND", sBlock.children[0].children[1].children[0].className)
            // .s-block.file-pair (sBlock) > div.name.col-file-pair > span.name-title > .exp-table-checkbox.checkbox > label > input
            // ToDo change .children[1] to _.find or something (as well as other stuff which might differ by layout/style)
            return null;
        }

        var sBlocks = TestUtils.scryRenderedDOMComponentsWithClass(testRawFilesStackedTable, 's-block');
        var filePairBlocksWithCheckboxes = sBlocks.filter(function(sBlock){
            return getFilePairCheckboxElement(sBlock) !== null;
        });

        // File pair blocks w checkboxes exist (prerequisite).
        expect(filePairBlocksWithCheckboxes.length).toBeGreaterThan(0); // If this fails, probably check getFilePairCheckboxElement.
        
        function selectedFilePairBlocksFileUUIDObj(sBlocks){
            return _.object(_.flatten(filePairBlocksWithCheckboxes.filter(function(sBlock){
                var elem = getFilePairCheckboxElement(sBlock);
                return elem.checked === true;
            }).map(function(sBlock){
                return getFilePairCheckboxElement(sBlock).getAttribute('data-select-files').split(',');//id.split('~').pop();
            }).map(function(accessionTriple){
                return _.map(accessionTriple, function(accessionTriple){
                    return [accessionTriple, true];
                });
            }), true));
        }

        // Ensure we have 5 initially selected file pairs in parentController state (from test def beforeEach)
        expect(_.keys(initiallySelectedFiles).length).toEqual(_.keys(testRawFilesStackedTable.ref.current.state.selectedFiles).length);

        // Check that the selected file pairs / files in state match checkboxes that are selected.
        function selectedFilesMatchSelectedCheckboxes(stateKeys){
            stateKeys = stateKeys || _.keys(testRawFilesStackedTable.ref.current.state.selectedFiles).sort();
            const fileKeys = _.keys(selectedFilePairBlocksFileUUIDObj(filePairBlocksWithCheckboxes)).sort();

            if (fileKeys.length !== stateKeys.length) return false;
            for (var i = 0; i < fileKeys.length; i++){
                if (fileKeys[i] !== stateKeys[i]) return false;
            }
            return true;
        }

        function clickRandomFilePairCheckboxes(){
            // Click on 7 random checkboxes (odd number so selectedFiles.size differs after)
            const clickOnCount = Math.round(filePairBlocksWithCheckboxes.length / 2) - 1;
            _.sample(filePairBlocksWithCheckboxes, clickOnCount).forEach(function(sBlock){
                TestUtils.Simulate.change(
                    getFilePairCheckboxElement(sBlock)
                );
            });
        }

        // Check initially selected files' checkboxes are selected
        expect(selectedFilesMatchSelectedCheckboxes()).toBe(true);

        // Check some checkboxes RANDOMLYish and compare again.
        var originalSelectedFiles = _.clone(testRawFilesStackedTable.ref.current.state.selectedFiles); // copy orig set
        clickRandomFilePairCheckboxes();
        // Ensure our state has changed in response to edits/clicks.
        expect(
            selectedFilesMatchSelectedCheckboxes(originalSelectedFiles)
        ).toEqual(
            false
        );

        // Make sure checkbox values align with state again... then click and check some more times.
        expect(selectedFilesMatchSelectedCheckboxes()).toBe(true);
        for (var i=0; i < 10; i++){
            clickRandomFilePairCheckboxes();
            expect(selectedFilesMatchSelectedCheckboxes()).toBe(true);
        }

        console.log("Initially selected files:\n", _.keys(originalSelectedFiles));
        console.log("Last pass (randomized clicking) selected files (this will differ between test runs) :\n", _.keys(testRawFilesStackedTable.ref.current.state.selectedFiles));

    });

});
