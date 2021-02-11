
describe('JupyterHub - Basic tests', function () {

    context('Login and run an example notebook ', function () {

        // the hard-coded block below will be replaced with the actual authentication cookie
        const jupyterhub_session_id='d6767f79c7b5440182dcee091937ec45';
        const _xsrf= '2|7cabbef2|58c7af9d9caa410c307a64d941a1c4ee|1613027841';
        const jupyterhub_user='2|1:0|10:1613039224|39:jupyterhub-user-ugurcamoglu%40gmail.com|48:ZmNiNzBiZTItN2RlNS00YzAzLWI5N2MtYTA4ZjIxZWFjMDQ5|25bcfe839a94d53710c5fbe0fadd81c78332be7f553973ac361ef8b85f541476';
        const jupyterhub_hub_login="2|1:0|10:1613039224|20:jupyterhub-hub-login|44:YzE2OWYzYjNmZmM3NDZiOGI2MjdiYmE2MzYyYzE2NWI=|2f5717b9fa300321ffb4f9a5ac35a1b688f5a82e873254a7a27cbaf5bdb50141";

        it('JupytherHub login and set cookie data', function () {
            // cy.loginJupyterhub({ 'email': 'ud4dntest@gmail.com', 'useEnvToken': false }).end();
            // Cypress.Cookies.debug(true);

            cy.setCookie('jupyterhub-session-id',jupyterhub_session_id);
            cy.setCookie('_xsrf', _xsrf);
            cy.setCookie('jupyterhub-user-ugurcamoglu%40gmail.com',jupyterhub_user);
            cy.setCookie('jupyterhub-hub-login',jupyterhub_hub_login );
            cy.visit('https://jupyter.4dnucleome.org/user/ugurcamoglu@gmail.com/tree?').wait(1000).end();
        });

        it('Ensure logged in, visit example file', function () {
            cy.get('#notebook_list .item_name').should('contain', 'examples').end();

            //Because it opens a new page in the click event, we act as a url
            cy.get('.item_link').should('have.attr', 'href')
                .then((href) => {
                    cy.setCookie('jupyterhub-session-id',jupyterhub_session_id);
                    cy.setCookie('_xsrf', _xsrf);
                    cy.setCookie('jupyterhub-user-ugurcamoglu%40gmail.com',jupyterhub_user);
                    cy.setCookie('jupyterhub-hub-login',jupyterhub_hub_login );

                    const newUrl='https://jupyter.4dnucleome.org'+href;
                    cy.visit(newUrl).end();
                });
        });

        it('Running Finn et al, Microscopy and HiC data overlayed file', function () {
            cy.setCookie('jupyterhub-session-id',jupyterhub_session_id);
            cy.setCookie('_xsrf', _xsrf);
            cy.setCookie('jupyterhub-user-ugurcamoglu%40gmail.com',jupyterhub_user);
            cy.setCookie('jupyterhub-hub-login',jupyterhub_hub_login );
            cy.visit('https://jupyter.4dnucleome.org/user/ugurcamoglu@gmail.com/notebooks/examples/Finn%20et%20al%2C%20Microscopy%20and%20HiC%20data%20overlayed.ipynb').end()
                .get('#run_int.btn-group .btn-default .toolbar-btn-label').should('contain', 'Run')
                .dblclick().end().wait(8000);
        });

        it('Finn et al, Microscopy and HiC data overlayed file result, total count matched ', function () {
            const $elem = Cypress.$('#notebook-container .cell.code_cell.rendered.unselected .output_wrapper .prompt.output_prompt bdi');

            //The test result is like this. Out [4]: this is how we do the replacement.
            const count =parseInt(($elem.text()).replace(/.*\[|\].*/g, ''));
            expect(count).to.be.greaterThan(0);

        });
    });

});

