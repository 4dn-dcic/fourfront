

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
                const intervalCount = Math.min(20, parseInt(totalCountExpected / 25));

                for (let interval = 0; interval < intervalCount; interval++) {
                    cy.scrollToBottom().then(() => {
                        cy.get('.search-results-container .search-result-row[data-row-number="' + (25 * (interval + 1)) + '"]').should('have.length', 1);
                    });
                }

            });

        });

        it('Filter by "Type" filter icon within search results', function () {
            cy.visit('/search/').wait(1000);
            let typeTitle;
            cy.searchPageTotalResultCount().then((totalCountExpected) => {
                const intervalCount = Math.min(5, parseInt(totalCountExpected / 25));
                cy.get('.search-result-row.detail-closed[data-row-number="' + intervalCount + '"] .search-result-column-block[data-field="@type"] .item-type-title').then(function ($typeTitle) {
                    typeTitle = $typeTitle.text().trim();
                })
                    .get('.search-result-row.detail-closed[data-row-number="' + intervalCount + '"] .search-result-column-block[data-field="@type"] .icon-container .icon').click({ force: true }).end()
                    .get('.facets-body .facet.open[data-field="type"] .term[data-selected=true] .facet-item').then(function ($selectedTypeTitle) {
                        const selectedTypeTitle = $selectedTypeTitle.text().trim();
                        cy.expect(typeTitle).equal(selectedTypeTitle);
                    });
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
                    return cy.get('.big-dropdown-menu-background .form-control').focus().clear().type('olfactory').wait(10).end()
                        .get('form.navbar-search-form-container').submit().end()
                        .location('search').should('include', 'q=olfactory').end()
                        .get(".btn.btn-outline-light.w-100[data-id='global-search-button']").click().end()
                        .searchPageTotalResultCount().should('be.lessThan', origResultCount).end();
                });

        });

        it('Can scroll all the way down without interruption', function(){

            cy.searchPageTotalResultCount().should('be.greaterThan', 50).should('be.lessThan', 30000).then((resultCount)=>{
                const intervalCount = parseInt(resultCount / 25) - ( resultCount % 25 > 0 ? 0 : 1); // Skip last interval if no more to load.

                for (let interval = 0; interval < intervalCount; interval++){
                    cy.scrollToBottom().end().get('.search-results-container .search-result-row[data-row-number="' + (25 * (interval + 1)) + '"]').should('have.length', 1);
                }
            });

        });


    });

});