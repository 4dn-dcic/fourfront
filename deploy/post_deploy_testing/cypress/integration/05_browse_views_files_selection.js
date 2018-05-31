

function checkUncheckFileCheckbox(origSelectedCount, $checkBox){
    return cy.wrap($checkBox).scrollToCenterElement().uncheck({ 'force' : true }).end()
        .getDownloadButton().invoke('text').then((downloadButtonTextContent)=>{
            let nextSelectedCount = downloadButtonTextContent.match(/\d/g);
            nextSelectedCount = parseInt(nextSelectedCount.join(''));
            expect(nextSelectedCount).to.be.lessThan(origSelectedCount);
            return cy.getSelectAllFilesButton().should('not.contain', "Deselect All");
        }).end().wrap($checkBox).check({ 'force' : true }).end()
        .getDownloadButton().invoke('text').then((downloadButtonTextContent)=>{
            let nextSelectedCount = downloadButtonTextContent.match(/\d/g);
            nextSelectedCount = parseInt(nextSelectedCount.join(''));
            expect(nextSelectedCount).to.equal(origSelectedCount);
            return cy.getSelectAllFilesButton().should('contain', "Deselect All");
        });
}


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
                .getDownloadButton().should('not.have.attr', 'disabled').end().window().screenshot();

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

        it.skip('File Type selection (filtering by file type will likely change soon)', function(){
            // TODO
        });

        it('ExpSets checkboxes are checked & can be toggled', function(){
            cy.getDownloadButton().invoke('text').then((downloadButtonTextContent)=>{
                let origSelectedCount = downloadButtonTextContent.match(/\d/g);
                origSelectedCount = parseInt(origSelectedCount.join(''));
                return cy.get('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]').each(($checkBox, idx)=>{
                    if (idx > 15) return;
                    return checkUncheckFileCheckbox(origSelectedCount, $checkBox);
                });
            });
        });

        it('ExpSets > FilePairs+Files checkboxes are checked & can be toggled.', function(){
            cy.getDownloadButton().invoke('text').then((downloadButtonTextContent)=>{
                let origSelectedCount = downloadButtonTextContent.match(/\d/g);
                origSelectedCount = parseInt(origSelectedCount.join(''));
                return cy.get('.search-results-container .search-result-row .search-result-column-block button.toggle-detail-button').should('have.length.greaterThan', 24).each(($toggleDetailButton, idx)=>{
                    if (idx > 7) return;
                    return cy.wrap($toggleDetailButton).scrollToCenterElement().click({ 'force' : true }).end()
                        .get('.search-results-container .search-result-row.open').then(($resultRow)=>{
                            return cy.get('.search-results-container .search-result-row.open .result-table-detail-container.open .files-tables-container h4 i.toggle-open-icon').each(($toggleFilesOpenButton, idx)=>{
                                cy.wrap($toggleFilesOpenButton).scrollToCenterElement().click({ 'force' : true }).wait(300).end()
                                .get('.search-results-container .search-result-row.open .result-table-detail-container.open .files-tables-container .stacked-block-table input[type="checkbox"]').each(checkUncheckFileCheckbox.bind(this, origSelectedCount)).end()
                                .wrap($toggleFilesOpenButton).scrollToCenterElement().click({ 'force' : true }).wait(300).end();
                            });    
                        }).end().wrap($toggleDetailButton).scrollToCenterElement().click({ 'force' : true }).end();
                });
            });
        });

        it('Can click Download button, get modal with proper contents', function(){
            cy.getDownloadButton().click().wait(100).end()
                .get('div.modal-dialog .modal-body form[method="POST"] input[type="hidden"][name="accession_triples"]').should('have.length', 1).end()
                .get('div.modal-dialog .modal-body form[method="POST"] input[type="hidden"][name="accession_triples"]').should('have.length', 1).end()
                .get('div.modal-dialog .modal-header button.close').click().wait(100).end();
        });

        it('"Deselect All Files" button works; checkboxes unchecked.', function(){

            cy.getSelectAllFilesButton().click().should('not.contain', "Deselect All").end()
                .getDownloadButton().should('have.attr', 'disabled')
                .getDownloadButton().invoke('text').then((downloadButtonTextContent)=>{
                    let foundNum = downloadButtonTextContent.match(/\d/g);
                    foundNum = parseInt(foundNum.join(''));
                    expect(foundNum).to.equal(0);
                }).end()
                .get('.search-results-container .search-result-row .search-result-column-block input[type="checkbox"]').should('not.be.checked');

        });


    });

});
