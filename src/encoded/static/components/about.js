// Render a simple static about page

var React = require('react');
var statics = require('../data/statics');

var AboutPage = module.exports = React.createClass({
    render: function() {
        return(
            <div className="static-page">
                <h1 className="page-title">About</h1>
                <div className="help-entry">
                    <h3 className="fourDN-section-title">4DN</h3>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.aboutDCIC}}></p>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.aboutAcknowledgement}}></p>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.aboutFunding}}></p>
                </div>
            </div>
        );
    }
});
