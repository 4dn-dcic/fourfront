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

import _ from 'underscore';


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
 * This emulates login.js. Perhaps we should adjust login.js somewhat to match this better re: navigate.then(...) .
 */
Cypress.Commands.add('login4DN', function(options = {}){

    const email = options.email || options.user || Cypress.env('LOGIN_AS_USER') || '4dndcic@gmail.com';
    const auth0client = Cypress.env('Auth0Client') || 'DPxEwsZRnKDpk0VfVAxrStRKukN14ILB';
    const auth0secret = Cypress.env('Auth0Secret');

    if (!auth0client || !auth0secret) throw new Error('Cannot test login if no Auth0Client & Auth0Secret in ENV vars.');

    Cypress.log({
        'name' : "Login 4DN",
        'message' : 'Attempting to impersonate-login for ' + email,
        'consoleProps' : ()=>{
            return { auth0client, auth0secret, email };
        }
    });

    // Generate JWT
    const jwtPayload = {
        'email': email,
        'email_verified': true,
        'aud': auth0client,
    };

    return cy.exec("exec python3 bin/py -c \"from base64 import b64decode; import jwt, json; print(jwt.encode(json.loads('" + JSON.stringify(jwtPayload).replace(/(\")/g, '\\"') + "'), b64decode('" + auth0secret + "', '-_'), algorithm='HS256').decode('utf-8'))\" &").then((jwt_gen_result)=>{

        const jwt_token = jwt_gen_result.stdout;

        //cy.setCookie('jwtToken', jwt_token); // w.fourfront.JWT.save(jwt_token) performs same action.

        return cy.window().then((w)=>{
            w.fourfront.JWT.save(jwt_token);
            var res = w.fourfront.navigate('', {'inPlace':true});
            
            if (res){
                return res.then((navResponse)=>{

                    return cy.request({ // Probably not needed except to validate JWT (we can just reload and be logged in by this point)
                        'url' : '/login',
                        'method' : 'POST',
                        'body' : JSON.stringify({'id_token' : jwt_token}),
                        'headers' : { 'Authorization': 'Bearer ' + jwt_token },
                        'followRedirect' : true
                    }).then(function(resp){
                        //w.fourfront.JWT.save(jwt_token);
                        w.fourfront.JWT.saveUserInfoLocalStorage(resp.body);
                        w.fourfront.app.updateUserInfo(); // Triggers app.state.session change
                    }).end();

                });
            }

        });



    });

});


Cypress.Commands.add('getQuickInfoBarCounts', function(options = {}){

    return cy.get('#stats-stat-expsets').invoke('text').should('have.length.above', 0).then((expsetCountElemText)=>{
        cy.get('#stats-stat-experiments').then((expCountElem)=>{
            cy.get('#stats-stat-files').then((fileCountElem)=>{
                var experiment_sets = parseInt(expsetCountElemText),
                    experiments     = parseInt(expCountElem.text()),
                    files           = parseInt(fileCountElem.text());

                return { experiment_sets, experiments, files };
            });
        });
    });

});

/** Session Caching */

var localStorageCache = { 'user_info' : null };
var cookieCache = { 'jwtToken' : null, 'searchSessionID' : null };


Cypress.Commands.add('saveBrowserSession', function(options = {}){
    _.forEach(_.keys(localStorageCache), function(storageKey){
        localStorageCache[storageKey] = localStorage.getItem(storageKey) || null;
    });
    _.forEach(_.keys(cookieCache), function(cookieKey){
        cookieCache[cookieKey] = cy.getCookie(cookieKey) || null;
    });
});

Cypress.Commands.add('loadBrowserSession', function(options = {}){
    _.forEach(_.keys(localStorageCache), function(storageKey){
        if (typeof localStorageCache[storageKey] === 'string'){
            localStorage.setItem(storageKey, localStorageCache[storageKey]);
        }
    });
    _.forEach(_.keys(cookieCache), function(cookieKey){
        if (typeof cookieCache[cookieKey] === 'string'){
            cy.setCookie(cookieKey, cookieCache[cookieKey]);
        }
    });
});

Cypress.Commands.add('clearBrowserSession', function(options = {}){
    _.forEach(_.keys(localStorageCache), function(storageKey){
        localStorageCache[storageKey] = null;
    });
    _.forEach(_.keys(cookieCache), function(cookieKey){
        cookieCache[cookieKey] = null;
    });
    cy.loadBrowserSession();
});


/* Hovering */

Cypress.Commands.add('hoverIn', { prevSubject : true }, function(subject, options){

    expect(subject.length).to.equal(1);

    var subjElem = subject[0];

    var bounds = subjElem.getBoundingClientRect();
    var cursorPos = { 'clientX' : bounds.left + (bounds.width / 2), 'clientY' : bounds.top + (bounds.height / 2) };
    var commonEventVals = _.extend({ bubbles : true, cancelable : true }, cursorPos);

    subjElem.dispatchEvent(new MouseEvent('mouseenter', commonEventVals ) );
    subjElem.dispatchEvent(new MouseEvent('mouseover', commonEventVals ) );
    subjElem.dispatchEvent(new MouseEvent('mousemove', commonEventVals ) );

    return subject;
});

Cypress.Commands.add('hoverOut', { prevSubject : true }, function(subject, options){

    expect(subject.length).to.equal(1);

    var subjElem = subject[0];

    var bounds = subjElem.getBoundingClientRect();
    var cursorPos = { 'clientX' : bounds.left + (bounds.width / 2), 'clientY' : bounds.top + (bounds.height / 2) };
    var commonEventValsIn = _.extend({ 'bubbles' : true, 'cancelable' : true, }, cursorPos);

    subjElem.dispatchEvent(new MouseEvent('mousemove', commonEventValsIn ) );
    subjElem.dispatchEvent(new MouseEvent('mouseover', commonEventValsIn ) );
    subjElem.dispatchEvent(new MouseEvent('mouseleave', _.extend({ 'relatedTarget' : subjElem }, commonEventValsIn, { 'clientX' : bounds.left - 5, 'clientY' : bounds.top - 5 }) ) );

    return subject;
});

