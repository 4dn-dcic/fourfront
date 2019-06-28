import React from 'react';



/** Compatibility layer until we create & fully test & export our own component */



// eslint-disable-next-line prefer-destructuring
export const DropdownButton = require('react-bootstrap').DropdownButton;
// eslint-disable-next-line prefer-destructuring
export const Dropdown = require('react-bootstrap').Dropdown;

// Non-ideal import of unknowns
const MenuItemV3 = require('react-bootstrap').MenuItem;         // React-Bootstrap v0.32.4 (Bootstrap v3)
const MenuItemV4 = require('react-bootstrap').DropdownItem;     // React-Bootstrap v1.0.0 (Bootstrap v4)
export const DropdownItem = MenuItemV4 || MenuItemV3;

