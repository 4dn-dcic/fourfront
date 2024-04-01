

describe('Post-Deployment Search View Tests', function () {

    context('/search/?type=Item', function () {

        before(function(){
            cy.visit('/search/');
        });

        beforeEach(function () {
            // Ensure we preserve search session cookie for proper ordering.
            cy.session('preserveCookies', () => {
                // Ensure we preserve search session cookie for proper ordering.
                cy.getCookie('searchSessionID').then((cookie) => {
                    if (cookie) {
                        cy.setCookie('searchSessionID', cookie.value);
                    }
                });
            });
        });

        it('Load as you scroll works for ?type=Item', function () {

            cy.location('search').should('include', 'type=Item');

            cy.searchPageTotalResultCount().then((totalCountExpected) => {
                const pageCount = Math.min(10, parseInt(totalCountExpected / 25));

                for (let page = 0; page < pageCount; page++) {
                    cy.scrollToBottom().then(() => {
                        cy.get('.search-results-container .search-result-row[data-row-number="' + (25 * (page + 1)) + '"]').should('have.length', 1);
                    });
                }

            });

        });

        it('Filter by "Type" filter icon within search results', function () {
            cy.visit('/search/?type=Item').wait(1000);//required
            let typeTitle;
            cy.searchPageTotalResultCount().then((totalCountExpected) => {
                const intervalCount = Math.floor(Math.random() * 5);//Math.min(5, parseInt(totalCountExpected / 25));
                cy.get('.search-result-row.detail-closed[data-row-number="' + intervalCount + '"] .search-result-column-block[data-field="@type"] .item-type-title').then(function ($typeTitle) {
                    typeTitle = $typeTitle.text().replace(/\s/g,'').replace(/([A-Z])/g, ' $1').trim();
                    cy.log('typeTitle:' + typeTitle);

                    cy.get('.search-result-row.detail-closed[data-row-number="' + intervalCount + '"] .search-result-column-block[data-field="@type"] .icon-container .icon').click({ force: true }).end();
                    cy.get('#page-title-container .page-title').should('contain', typeTitle)
                        .get('.facets-body .facet[data-field="type"] .term[data-selected=true] .facet-item').then(function ($selectedTypeTitle) {
                            const selectedTypeTitle = $selectedTypeTitle.text().trim();
                            cy.expect(typeTitle).equal(selectedTypeTitle);
                        });
                }).end();

            });
        });

    });


    context('q=olfactory results are consistently ordered', function(){

        before(function(){
            cy.visit('/search/');
        });

        beforeEach(function () {
            // Ensure we preserve search session cookie for proper ordering.
            cy.session('preserveCookies', () => {
                // Ensure we preserve search session cookie for proper ordering.
                cy.getCookie('searchSessionID').then((cookie) => {
                    if (cookie) {
                        cy.setCookie('searchSessionID', cookie.value);
                    }
                });
            });
        });

        it('Starting from /search/, typing "olfactory" into searchbox redirects back to search', function () {
            cy.get("a#search-menu-item").click().end()
                .searchPageTotalResultCount().should('be.greaterThan', 100).then(function (origResultCount) {
                    return cy.get('.big-dropdown-menu-background .form-control').focus().clear().type('olfactory', { delay: 0 }).should('have.value', 'olfactory').end()
                        .get('form.navbar-search-form-container').submit().end()
                        .location('search').should('include', 'q=olfactory').end()
                        .get(".btn.btn-outline-light.w-100[data-id='global-search-button']").click().end()
                        .searchPageTotalResultCount().should('be.lessThan', origResultCount).end();
                });

        });

        it('Can scroll all the way down without interruption', function(){

            cy.searchPageTotalResultCount().should('be.greaterThan', 50).should('be.lessThan', 30000).then((resultCount)=>{
                let pageCount = parseInt(resultCount / 25) - ( resultCount % 25 > 0 ? 0 : 1); // Skip last interval if no more to load.
                pageCount = Math.min(pageCount, 10);

                for (let page = 0; page < pageCount; page++){
                    cy.scrollToBottom().end().get('.search-results-container .search-result-row[data-row-number="' + (25 * (page + 1)) + '"]').should('have.length', 1);
                }
            });

        });


    });

});
