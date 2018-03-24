

describe('Some Initial Static Tests', function () {



    context('Expected Static Titles & Content', function () {

        it('Home Page Title is present and matching expected strings.', function () {

            cy.visit('/');

            cy.title().should('include', '4DN Data Portal');

            cy.get('#page-title-container span.title').should('have.text', '4D Nucleome Data Portal');

            cy.get('#page-title-container div.subtitle').should('have.text', 'A platform to search, visualize, and download nucleomics data.');

        });

    });



});