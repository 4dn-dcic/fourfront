// Render a simple static about page

var React = require('react');
var globals = require('../globals');

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
        return(
            <div className="static-page">
                <h1 className="page-title">About</h1>
                <div className="help-entry">
                    <h3 className="fourDN-header">Team & Contact</h3>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: c.dcic}}></p>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: c.acknowledgements}}></p>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: c.funding}}></p>
                </div>
            </div>
        );
    }
});

globals.content_views.register(AboutPage, 'AboutPage');