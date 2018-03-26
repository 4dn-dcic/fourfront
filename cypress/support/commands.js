// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

/** Expected to throw error of some sort if not on search page, or no results. */
Cypress.Commands.add('searchPageTotalResultCount', (options) => {
    return cy.get('div.above-results-table-row .box.results-count > span.text-500').then(($searchResultCountBox)=>{
        return parseInt($searchResultCountBox.text());
    });
});

Cypress.Commands.add('scrollToBottom', (options) => {
    return cy.get('body').then(($body)=>{
        cy.scrollTo(0, $body[0].scrollHeight);
    });
});
