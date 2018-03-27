

describe('Some Initial Static Tests', function () {



    context('Expected Static Titles & Content on Homepage', function () {


        it('Home Page Title is present and matching expected strings.', function () {

            cy.visit('/');

            cy.title().should('include', '4DN Data Portal');

            cy.get('#page-title-container span.title').should('have.text', '4D Nucleome Data Portal');

            cy.get('#page-title-container div.subtitle').should('have.text', 'A platform to search, visualize, and download nucleomics data.');

        });

/*
        it('Login works', function(){
            
            cy.login4DN();

        });
*/

    });


    context('Can navigate around other pages', function () {

        before(function(){
            cy.visit('/');
        });


        it('On Home Page', function () {

            cy.title().should('include', '4DN Data Portal');

        });

        it('Help dropdown has some items, we can click & visit them, and each page has different title.', function(){

            cy.get('#sHelp').click().then(()=>{
                cy.get('ul[aria-labelledby="sHelp"] li a').then((listItems)=>{
                    console.log(listItems);

                    cy.get('#page-title-container span.title').should('have.text', '4D Nucleome Data Portal').then((title)=>{

                        let prevTitle = title.text();
                        let count = 0;

                        function doVisit(listItem, ){
                            listItem.click();
                            cy.get('#page-title-container span.title')
                                .should('not.have.text', prevTitle).then((t)=>{
                                    var titleText = t.text();
                                    expect(titleText).to.have.length.above(0);
                                    prevTitle = titleText;

                                    // Finish
                                    count++;
                                    if (count < listItems.length){
                                        doVisit(listItems[count]);
                                    }
                                });
                        }

                        doVisit(listItems[count]);

                    });
                    
                });
            });

        });

/*
        it('Login works', function(){
            
            cy.login4DN();

        });
*/

    });





});