
describe('Browse Views - Files Selection', function () {

    context('Ensure "Select All Files" & related features are functional.', function(){

        before(function(){
            cy.visit('/browse/?award.project=4DN&experimentset_type=replicate&type=ExperimentSetReplicate');
        });

        it('We have some counts in QuickInfoBar to compare selected file counts against.', function(){

            cy.get('#select-barplot-field-1').should('not.have.attr', 'disabled').end()
                .getQuickInfoBarCounts().then((counts)=>{
                    expect(counts.experiment_sets).to.be.greaterThan(7);
                    expect(counts.files).to.be.greaterThan(20);
                });

        });


        it('"Select All Files" button works & becomes "Deselect All" after.', function(){

            cy.getSelectAllFilesButton().click().should('contain', "Deselect All").end()
                .getDownloadButton().should('not.have.attr', 'disabled');

        });

        it('Number of files selected for download matches QuickInfoBar file count.', function(){
            cy.getQuickInfoBarCounts().then((counts)=>{
                return cy.getDownloadButton().invoke('text').then((downloadButtonTextContent)=>{
                    let foundNum = downloadButtonTextContent.match(/\d/g);
                    foundNum = parseInt(foundNum.join(''));
                    expect(foundNum).to.equal(counts.files);
                });
            });
        });

        it.skip('TODO: Assert 7+ ExpSets detailPanes have selected, working checkboxes', function(){
            // TODO
        });

        it('"Deselect All Files" button works.', function(){

            cy.getSelectAllFilesButton().click().should('not.contain', "Deselect All").end()
                .getDownloadButton().should('have.attr', 'disabled')
                .getDownloadButton().invoke('text').then((downloadButtonTextContent)=>{
                    let foundNum = downloadButtonTextContent.match(/\d/g);
                    foundNum = parseInt(foundNum.join(''));
                    expect(foundNum).to.equal(0);
                });

        });


    });

});
