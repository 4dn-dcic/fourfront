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




/**
 * The below tests are currently non-functioning. 
 */


/** Currently not working (cy.visit stops working after setting JWT) */

Cypress.Commands.add('login4DN', function(options = {}){

    const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6IndyYW5nbGVyQHdyYW5nbGVyLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJhdWQiOiJEUHhFd3NaUm5LRHBrMFZmVkF4clN0Ukt1a04xNElMQiJ9.WuUK4FL6CJZlNcxev4YSB82cT2qoWuDyC6P2YDgnZGo';// Cypress.env('JWT_TOKEN');

    if (!token) throw new Error('No token defined in env vars. Cannot log in.');

    cy.clearCookies();
    cy.setCookie('jwtToken', token); // cy.visit stops working after this.
    cy.request({ // Probably not needed except to validate JWT
        'url' : '/login',
        'method' : 'POST',
        'body' : JSON.stringify({'id_token' : token}),
        'headers' : { 'Authorization': 'Bearer ' + token },
        'followRedirect' : true
    }).then(function(resp){
        cy.window().then((w)=>{
            //w.JWT.save(token);
            //w.JWT.saveUserInfoLocalStorage(resp.body);
            cy.visit('/');
            cy.visit('/browse/');
        });
    });
    //cy.visit('/', { "failOnStatusCode" : false, /*'auth' : { 'bearer' : token }*/ onBeforeLoad : function(){ console.log(arguments); } }).then((w)=>{
    //
    //});
});


Cypress.Commands.add('login4DN2', function(options = {}){

    const email = options.email || Cypress.env('loginEmail') || '4dndcic@gmail.com';
    
    const auth0client = 'DPxEwsZRnKDpk0VfVAxrStRKukN14ILB';
    const auth0secret = Cypress.env('Auth0Secret');

    const jwtPayload = {
        'email': email,
        'email_verified': true,
        'aud': auth0client,
    };

    Cypress.log({
        'name' : "Login 4DN",
        'message' : 'Attempting to impersonate-login for ' + email,
        'consoleProps' : ()=>{
            return { auth0client, auth0secret, email };
        }
    });


    // We execute this with NodeJS OUTSIDE of test browser otherwise it messes with browser context etc.

    cy.exec("exec python3 bin/py -c \"from base64 import b64decode; import jwt, json; print(jwt.encode(json.loads('" + JSON.stringify(jwtPayload).replace(/(\")/g, '\\"') + "'), b64decode('" + auth0secret + "', '-_'), algorithm='HS256').decode('utf-8'))\" &").then((res)=>{
        
        var userJWT = res.stdout;

        console.log('Generated JWT', userJWT);

        cy.setCookie('jwtToken', userJWT);

        /*
        cy.request({ // Probably not needed except to validate JWT
            'url' : '/login',
            'method' : 'POST',
            'body' : JSON.stringify({'id_token' : userJWT}),
            'headers' : { 'Authorization': 'Bearer ' + userJWT },
            'followRedirect' : true
        }).then(function(resp){
            JWT.saveUserInfoLocalStorage(resp.body);
            cy.visit('/');
        });
        */

        cy.visit('/');

    });


});