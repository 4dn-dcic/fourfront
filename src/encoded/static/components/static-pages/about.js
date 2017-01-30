// Render a simple static about page

var React = require('react');
var globals = require('../globals');
var { Wrapper } = require('./static-page-base');

var AboutPage = module.exports = React.createClass({

    propTypes : {
        context : React.PropTypes.shape({
            "content" : React.PropTypes.shape({
                "dcic" : React.PropTypes.string,
                "acknowledgements" : React.PropTypes.string,
                "funding" : React.PropTypes.string
            }).isRequired
        }).isRequired
    },

    render: function() {
        var c = this.props.context.content;
        return (
            <Wrapper title="About">
                <div className="help-entry">

                    <h3 className="fourDN-header">Introduction</h3>
                    <div className="fourDN-content" dangerouslySetInnerHTML={{__html: c.introduction}}></div>

                    <h3 className="fourDN-header">Team & Contact</h3>
                    <div className="fourDN-content" dangerouslySetInnerHTML={{__html: c.dcic}}></div>

                    <div className="fourDN-content" dangerouslySetInnerHTML={{__html: c.acknowledgements}}></div>
                    <div className="fourDN-content" dangerouslySetInnerHTML={{__html: c.funding}}></div>
                </div>
            </Wrapper>
        );
    }
});

globals.content_views.register(AboutPage, 'AboutPage');