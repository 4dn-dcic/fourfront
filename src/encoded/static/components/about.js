// Render a simple static about page

var React = require('react');
var statics = require('../data/statics');

var AboutPage = module.exports = React.createClass({
    render: function() {
        return(
            <div className="static-page">
                <div className="help-entry">
                    <h3 className="fourDN-section-title">About</h3>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.aboutDCIC}}></p>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.aboutAcknowledgement}}></p>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.aboutFunding}}></p>
                </div>
            </div>
        );
    }
});
