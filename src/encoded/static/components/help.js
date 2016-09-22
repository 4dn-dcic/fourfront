// Render a simple static help page

var React = require('react');
var statics = require('../data/statics');

var HelpPage = module.exports = React.createClass({
    render: function() {
        return(
            <div>
                <div className="help-entry">
                    <h3 id="gettingstarted" className="fourDN-section-title">Getting started</h3>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.gettingStarted}}></p>
                </div>
                <div className="help-entry">
                    <h3 id="metadatastructure" className="fourDN-section-title">Metadata structure</h3>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.metadataStructure1}}></p>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.metadataStructure2}}></p>
                </div>
                <div className="help-entry">
                    <h3 id="datasubmission" className="fourDN-section-title">Data submission via spreadsheet</h3>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.submissionXLS}}></p>
                </div>
                <div className="help-entry">
                    <h3 id="restapi" className="fourDN-section-title">REST API</h3>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.restAPI}}></p>
                </div>
            </div>
        );
    }
});
