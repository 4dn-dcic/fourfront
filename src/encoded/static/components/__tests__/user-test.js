'use strict';

/* Basing off of browse.js to test user.js */

jest.autoMockOff();

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('underscore');
//jest.dontMock('../objectutils');

function mapStateToProps(store) {
   return {
       expSetFilters: store.expSetFilters,
       context : store.context
   };
}

describe('Testing user.js', function() {
    var React, User, testItem, TestUtils, page, store, context, filters, _, Wrapper;

    beforeEach(function() {
        React = require('react');
        var { Provider, connect } = require('react-redux');
        TestUtils = require('react/lib/ReactTestUtils');
        _ = require('underscore');
        User = require('../user').User;
        context = require('../testdata/submitter');
        store = require('../../store');
        var dispatch_vals = {
            'context' : context
        };
        store.dispatch({
            type: dispatch_vals
        });
        Wrapper = React.createClass({
            childContextTypes: {
                location_href: React.PropTypes.string,
                navigate: React.PropTypes.func
            },
            getChildContext: function() {
                return {
                    location_href: "http://localhost:8000/users/0abbd494-b852-433c-b360-93996f679dae/",
                    navigate: function(){return;}
                };
            },
            render: function() {
                return (
                    <div>{this.props.children}</div>
                );
            }
        });

        // Mock this b/c certain data doesn't exist in test environment -- e.g. REST endpoints for test lab data which is to be AJAXed in.
        jest.mock('../formatted-info-block');

        var UseUser = connect(mapStateToProps)(User);
        page = TestUtils.renderIntoDocument(
            <Wrapper>
                <Provider store={store}><UseUser context={context}/></Provider>
            </Wrapper>
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

    it('Check Editable Fields - edit, check validation, cancel (no saving)', function() {

        function testEditField(className, initialVal, inputFieldID){
            var isRow = className.indexOf('row') > -1;
            var fields = TestUtils.scryRenderedDOMComponentsWithClass(page, 'editable-field-entry ' + className); // FaxField is 'row' style.
            var field = fields[0];

            var fieldValue = isRow ? field.children[1] : field.children[0]; // First child is label if row.
            var fieldValueEditButton = isRow ? fieldValue.children[0] : fieldValue.children[1];
            var fieldValueElement = isRow ? fieldValue.children[1] : fieldValue.children[0];
            expect(fieldValueElement.textContent).toEqual(initialVal); // Initial value
            expect(fieldValue.className.indexOf('editing')).toBe(-1); // Initial state (not editing)
            expect(field.className.indexOf('has-error')).toBe(-1); // Shouldn't display any errors

            TestUtils.Simulate.click(fieldValueEditButton);
            // Make sure we're now in 'edit' mode -
            expect(fieldValue.className.indexOf('editing')).toBeGreaterThan(-1);

            // Should now have 1 input element on screen w/ id == fax.
            var inputFields = TestUtils.scryRenderedDOMComponentsWithClass(page, 'form-control');
            expect(inputFields.length).toEqual(1);
            var inputField = inputFields[0];
            expect(inputField.id).toBe(inputFieldID);

            // Pretend we're typing
            
            TestUtils.Simulate.change(inputField, {
                target : {
                    value : '123456789abcde',
                    validity : { valid : false },
                    validationMessage: "Some error message"
                }
            });

            if (inputField.getAttribute('inputmode') === 'tel'){
                // Should have an error now (no letters)
                expect(field.className.indexOf('has-error')).toBeGreaterThan(-1);

                // Fix error
                TestUtils.Simulate.change(inputField, {
                    target : {
                        value : '16175551234',
                        validity : { valid : true }, // We mock event validation result as this is performed by browser.
                        validationMessage: ""
                    }
                });

                expect(field.className.indexOf('has-error')).toBe(-1);
            }

            // Cancel out (no REST server running to test save)
            var cancelButton = isRow ? fieldValue.children[0] : fieldValue.children[1];
            TestUtils.Simulate.click(cancelButton);

            // Make sure we're out of edit mode -
            expect(fieldValue.className.indexOf('editing')).toBe(-1);
        }

        testEditField('row fax', 'No fax number', 'fax');
        testEditField('row phone1', 'No phone number', 'phone1');
        testEditField('row skype', 'No skype ID', 'skype');
        testEditField('inline first_name', 'Ad', 'first_name');
        testEditField('inline last_name', 'Est', 'last_name');

    });

    it('Access Keys table not present when no submits_for field', function() {
        // Test user has no 'submits_for', so must not have access keys table visible.
        var akContainer = TestUtils.scryRenderedDOMComponentsWithClass(page, 'access-keys-container');
        expect(akContainer.length).toEqual(0);
    });

});
