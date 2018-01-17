'use strict';

/* Basing off of browse.js to test user.js */

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');

function mapStateToProps(store) {
    return {
        context : store.context
    };
}

describe('Testing user.js', function() {
    var React, User, user, testItem, TestUtils, page, store, context, filters, _, Wrapper, sinon, getNestedProperty, props;
    beforeAll(function() {
        React = require('react');
        var { Provider, connect } = require('react-redux');
        TestUtils = require('react-dom/lib/ReactTestUtils');
        _ = require('underscore');
        User = require('./../item-pages/UserView').default;
        context = require('../testdata/submitter');
        store = require('../../store');
        getNestedProperty = require('../util').object.getNestedProperty;
        var dispatch_vals = {
            'context' : context
        };
        store.dispatch({
            type: dispatch_vals
        });

        props = {
            'context' : context,
            'href' : "http://localhost:8000/users/0abbd494-b852-433c-b360-93996f679dae/",
            'navigate' : function(){ console.info("Mocked Navigate Function was called."); return; },
            'listActionsFor' : function(category){ 
                // 'Mocked' version
                if (category === 'context') {
                    return [
                        {
                            'name' : 'edit'
                        }
                    ];
                }
            }
        }

        // Mock this b/c certain data doesn't exist in test environment -- 
        // e.g. REST endpoints for test lab data which is to be AJAXed in.
        jest.mock('./../item-pages/components/FormattedInfoBlock');

        var UseUser = connect(mapStateToProps)(User);
        page = TestUtils.renderIntoDocument(
            <Provider store={store}>
                <UseUser {...props}  />
            </Provider>
        );

    });

    it('has panels for user info and work info, with some profile fields', function() {
        var panelUserInfo = TestUtils.scryRenderedDOMComponentsWithClass(page, 'user-info');
        expect(panelUserInfo.length).toEqual(1);
        var panelWorkInfo = TestUtils.scryRenderedDOMComponentsWithClass(page, 'user-work-info');
        expect(panelWorkInfo.length).toEqual(1);

        // These fields are 'row' style
        var phoneField = TestUtils.scryRenderedDOMComponentsWithClass(page, 'editable-field-entry phone1 row'),
            faxField = TestUtils.scryRenderedDOMComponentsWithClass(page, 'editable-field-entry fax row'),
            skypeField = TestUtils.scryRenderedDOMComponentsWithClass(page, 'editable-field-entry skype row');

        var emailField = TestUtils.scryRenderedDOMComponentsWithClass(page, 'editable-field-entry email row');

        expect(phoneField.length).toEqual(1);
        expect(faxField.length).toEqual(1);
        expect(skypeField.length).toEqual(1);

        expect(emailField[0].children[1].children[0].textContent.trim()).toEqual('4dndcic@gmail.com'); // Initial value via ../testdata/submitter.js
    });

    it('Editable Fields - editing, validation check, cancel (no save), and saving + value updates in response', function() {

        sinon = require('sinon');
        var server = sinon.fakeServer.create();

        var childElemIndicesByStyle = {
            // Minimal style is not tested & subject to change (not used yet in front-end)
            valueContainer  : { 'row' : 1, 'inline' : 0, 'minimal' : 0 },  // 'row' style has label column as first child
            editButton      : { 'row' : 0, 'inline' : 1, 'minimal' : 0 },  // row & minimal styles have button before value, floating right
            valueElement    : { 'row' : 1, 'inline' : 0, 'minimal' : 1 },  // inverse of editButton position
            cancelButton    : { 'row' : 0, 'inline' : 1, 'minimal' : 0 },  // see editButton position
            saveButton      : { 'row' : 1, 'inline' : 2, 'minimal' : 1 }   // save button is after cancel button
        };

        function testEditField(className, initialVal, finalVal, inputFieldID, save=false){
            var fieldStyle = className.indexOf('row') > -1 ? 'row' : className.indexOf('inline') > -1 ? 'inline' : 'minimal';
            var fields = TestUtils.scryRenderedDOMComponentsWithClass(page, 'editable-field-entry ' + className);
            var field = fields[0];

            var fieldValue = field.children[childElemIndicesByStyle.valueContainer[fieldStyle]];
            var fieldValueEditButton = fieldValue.children[childElemIndicesByStyle.editButton[fieldStyle]];
            var fieldValueElement = fieldValue.children[childElemIndicesByStyle.valueElement[fieldStyle]];
            expect(fieldValueElement.textContent.trim()).toEqual(initialVal); // Initial value
            expect(fieldValue.className.indexOf('editing')).toBe(-1); // Initial state (not editing)
            expect(field.className.indexOf('has-error')).toBe(-1); // Shouldn't display any errors

            TestUtils.Simulate.click(fieldValueEditButton);
            // Make sure we're now in 'edit' mode -
            expect(fieldValue.className.indexOf('editing')).toBeGreaterThan(-1);

            // Should now have 1 input element on screen w/ id == inputFieldID.
            var inputFields = TestUtils.scryRenderedDOMComponentsWithClass(page, 'form-control');
            expect(inputFields.length).toEqual(1);
            var inputField = inputFields[0];
            expect(inputField.id).toBe(inputFieldID);

            // Pretend we're typing (change event)

            // Try a value that'd be error-ful re: validation depending on field's inputmode.
            if (inputField.getAttribute('inputmode') === 'tel'){

                TestUtils.Simulate.change(inputField, {
                    target : {
                        value : '123456789abcde',
                        validity : { valid : false },
                        validationMessage: "Some error message"
                    }
                });

                // Should have an error now (no letters in phone format excl. extension)
                expect(field.className.indexOf('has-error')).toBeGreaterThan(-1);
            }

            // Correct input value
            TestUtils.Simulate.change(inputField, {
                target : {
                    value : finalVal || '16175551234',
                    validity : { valid : true }, // We mock event validation result as this is performed by browser.
                    validationMessage: ""
                }
            });

            expect(field.className.indexOf('has-error')).toBe(-1);

            if (!save){
                // Cancel out
                var cancelButton = fieldValue.children[childElemIndicesByStyle.cancelButton[fieldStyle]];
                TestUtils.Simulate.click(cancelButton);
                // Make sure we're out of edit mode -
                expect(fieldValue.className.indexOf('editing')).toBe(-1);
            } else {
                // Save
                var saveButton = fieldValue.children[childElemIndicesByStyle.saveButton[fieldStyle]];

                // Setup dummy server response (success)
                var escapedID = context['@id'].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                var pathRegex = new RegExp(escapedID + "(\\?ts=(\\d+))?");
                server.respondWith(
                    "PATCH",
                    pathRegex,
                    [
                        200, 
                        { "Content-Type" : "application/json" },
                        JSON.stringify({ "status" : "success" })
                    ]
                );

                TestUtils.Simulate.click(saveButton);
                server.respond();
                jest.runAllTimers(); // There is a 0ms setTimeout between store.dispatch (update Redux context prop) & setState in EditableField.
                
                // Make sure we're out of edit mode -
                expect(fieldValue.className.indexOf('editing')).toBe(-1);

                // Make sure value is now up-to-date in EditableField component on front-end view.
                fieldValueElement = fieldValue.children[childElemIndicesByStyle.valueElement[fieldStyle]]; // Update element reference
                expect(fieldValueElement.textContent.trim()).toBe(finalVal);

                // Make sure value is now up-to-date in Redux store/context
                var updatedContext = store.getState().context;
                var updatedValueInContext = getNestedProperty(updatedContext,inputFieldID);
                expect(updatedValueInContext).toBe(finalVal);
            }

        }

        testEditField('row fax', 'No fax number', '16175551234' , 'fax', false);
        testEditField('row phone1', 'No phone number', '16175551234', 'phone1', true);
        testEditField('row skype', 'No skype ID', 'alexkb0009', 'skype', false);
        // Don't test for now, need to adjust test for new html markup. Field functionality is same as rows above.
        //testEditField('inline first_name', 'Ad', 'Alex', 'first_name', false);
        //testEditField('inline last_name', 'Est', 'Balashov', 'last_name', true);

        server.restore();

    });

    it('Access Keys table not present when no submits_for field', function() {
        // Test user has no 'submits_for', so must not have access keys table visible.
        var akContainer = TestUtils.scryRenderedDOMComponentsWithClass(page, 'access-keys-container');
        expect(akContainer.length).toEqual(0);
    });

});
