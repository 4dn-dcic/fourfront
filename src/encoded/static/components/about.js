// Render a simple static about page

var React = require('react');
var statics = require('../data/statics');

var AboutPage = module.exports = React.createClass({
    render: function() {
        return(
            <div>
                <div className="help-entry">
                    <h3 id="gettingstarted" className="fourDN-section-title">About</h3>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.aboutDCIC}}></p>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.aboutAcknowledgement}}></p>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.aboutFunding}}></p>
                </div>
            </div>
        );
    }
});
