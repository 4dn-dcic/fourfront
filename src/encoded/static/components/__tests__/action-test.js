'use strict';

/*Test action.js, which is used for both creating and editing items
To actually fill fields, mock context.fetch in the Wrapper to return
the frame=object form of the bisource used*/

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');


describe('Testing item.js', function() {
    var sinon, server;
    var React, Action, testCreate, testEdit, TestUtils, FetchContext, context, schemas, biosource_search, _, Wrapper, ajax;

    beforeAll(function() {
        React = require('react');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');
        Action = require('../action');
        context = require('../testdata/biosample/uberon-2371-object');
        schemas = require('../testdata/schemas');
        biosource_search = require('../testdata/search/biosource_all');
        ajax = require('../util/ajax');

        // return /search/?type=Biosource&format=json for ajax.promise calls
        ajax.promise = jest.fn(() => Promise.resolve(biosource_search));
        sinon = require('sinon');
        server = sinon.fakeServer.create();
        
        server.respondWith(
            "GET",
            '/biosamples/ENCBS989WPD',
            [
                200, 
                { "Content-Type" : "application/json" },
                JSON.stringify(context)
            ]
        );

        testCreate = TestUtils.renderIntoDocument(
            <Action schemas={schemas} context={context} edit={false}/>
        );
        testEdit = TestUtils.renderIntoDocument(
            <Action schemas={schemas} context={context} edit={true}/>
        );
    });

    it('Create and Edit use the correct titles and subtitle', function() {
        var createTitles = TestUtils.scryRenderedDOMComponentsWithTag(testCreate, 'h2');
        expect(createTitles.length).toEqual(1);
        expect(createTitles[0].innerHTML.toLowerCase()).toEqual('creating biosample with encbs989wpd as template');
        var editTitles = TestUtils.scryRenderedDOMComponentsWithTag(testEdit, 'h2');
        expect(editTitles.length).toEqual(1);
        expect(editTitles[0].innerHTML.toLowerCase()).toEqual('editing biosample encbs989wpd');
        var subTitles = TestUtils.scryRenderedDOMComponentsWithTag(testCreate, 'h4');
        expect(subTitles.length).toEqual(1);
        expect(subTitles[0].innerHTML.toLowerCase()).toEqual('add, edit, and remove field values. submit at the bottom of the form.');
    });

    it('Key values are found within the schema', function() {
        // the schema used is outdated
        var schemaKeys = Object.keys(schemas['Biosample']['properties']);
        var schemaTitles = [];
        for(var i=0; i<schemaKeys.length; i++){
            var subschema = schemas['Biosample']['properties'][schemaKeys[i]];
            if(subschema.title){
                schemaTitles = schemaTitles.concat([subschema.title.toLowerCase()]);
            }else{
                schemaTitles = schemaTitles.concat([schemaKeys[i].toLowerCase()]);
            }
        }
        var keyValues = TestUtils.scryRenderedDOMComponentsWithTag(testCreate, 'dt');
        expect(keyValues.length).toEqual(54);
        keyValues.map(function(keyVal){
            _.find(keyVal.children, function(child){
                if(child.tagName.toLowerCase() == 'span'){
                    expect(_.contains(schemaTitles, child.innerHTML.toLowerCase())).toBeTruthy();
                }
            });
        });
        var cancelButtons = TestUtils.scryRenderedDOMComponentsWithClass(testCreate, 'cancel-button');
        expect(cancelButtons.length).toEqual(54);
    });

    it('Handles object and array fields correctly', function() {
        var arrControls = TestUtils.scryRenderedDOMComponentsWithClass(testCreate, 'array-expand');
        expect(arrControls.length).toEqual(13);
        var objPanels = TestUtils.scryRenderedDOMComponentsWithClass(testCreate, 'panel-create-obj');
        // none of these have been opened yet
        expect(objPanels.length).toEqual(0);
        // simulate click to expand
        TestUtils.Simulate.click(arrControls[0]);
        objPanels = TestUtils.scryRenderedDOMComponentsWithClass(testCreate, 'panel-create-obj');
        // one has been opened. This is publications, which is an array of linkedObjs
        expect(objPanels.length).toEqual(1);
        var addItem;
        var openObj;
        _.find(objPanels[0].children[0].children[0].children, function(child){
            if(child.tagName.toLowerCase() == 'a'){
                expect(child.title.toLowerCase()).toEqual('add item');
                // add an item to the array
                addItem = child;
            }
        });
        // array elements are created and deleted properly
        for(var i=0; i<4; i++){
            var expectedCount = i;
            if(i>0 && i<3){
                TestUtils.Simulate.click(addItem);
            }
            var deleteArrControls = TestUtils.scryRenderedDOMComponentsWithClass(testCreate, 'cancel-button-inline');
            // delete item on last iteration instead of adding and count items
            if(i==3){
                TestUtils.Simulate.click(deleteArrControls[0]);
                expectedCount = 1;
                deleteArrControls = TestUtils.scryRenderedDOMComponentsWithClass(testCreate, 'cancel-button-inline');
            }
            expect(deleteArrControls.length).toEqual(expectedCount);
        }
        // make sure object panels open correctly
        _.find(objPanels[0].children[1].children[0].children[0].children[0].children[0].children[0].children[0].children, function(child){
            if(child.tagName.toLowerCase() == 'a'){
                expect(child.title.toLowerCase()).toEqual('expand objects');
                // add an item to the array
                openObj = child;
            }
        });
        var panelHeadings = TestUtils.scryRenderedDOMComponentsWithClass(testCreate, 'panel-heading');
        expect(panelHeadings.length).toEqual(1);
        TestUtils.Simulate.click(openObj);
        expect(openObj.title.toLowerCase()).toEqual('close objects');
        // add a panel heading for the opened obj
        panelHeadings = TestUtils.scryRenderedDOMComponentsWithClass(testCreate, 'panel-heading');
        expect(panelHeadings.length).toEqual(2);
        TestUtils.Simulate.click(openObj);
        expect(openObj.title.toLowerCase()).toEqual('expand objects');
        panelHeadings = TestUtils.scryRenderedDOMComponentsWithClass(testCreate, 'panel-heading');
        expect(panelHeadings.length).toEqual(1);
    });

    it('Uses text and integer inputs', function() {
        var inputs = TestUtils.scryRenderedDOMComponentsWithTag(testCreate, 'input');
        var textInputs = 0;
        var numInputs = 0;
        inputs.forEach(function(input){
            if(input.type.toLowerCase() == 'text'){
                textInputs += 1;
            }else if(input.type.toLowerCase() == 'number'){
                numInputs += 1;
            }
        });
        expect(inputs.length).toEqual(16);
        expect(textInputs).toEqual(15);
        expect(numInputs).toEqual(1);
    });

    it('Has a validation button that shouldnt work', function(){
        var warnButtons = TestUtils.scryRenderedDOMComponentsWithClass(testCreate, 'btn-info');
        expect(warnButtons.length).toEqual(1);
        expect(warnButtons[0].innerHTML.toLowerCase()).toEqual('test object validity');
        // click, which should trigger the spinning icon (this.state.processingFetch)
        TestUtils.Simulate.click(warnButtons[0]);
        expect(warnButtons.length).toEqual(1);
        expect(warnButtons[0].innerHTML.toLowerCase()).toEqual('<i class="icon icon-spin icon-circle-o-notch"></i>');
    });

});
