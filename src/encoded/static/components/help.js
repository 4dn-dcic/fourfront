// Render a simple static help page

var React = require('react');
var statics = require('../data/statics');
var Button = require('react-bootstrap').Button;

var HelpPage = module.exports = React.createClass({
    // TODO: fix ugly hack, wherein I set id in the h3 above actual spot because the usual way of doing anchors cut off entries
    render: function() {
        return(
            <div className="static-page">

                <h1 className="page-title">Help</h1>

                <div className="help-entry">
                    <h3 id="metadata-structure" className="fourDN-section-title">Getting started</h3>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.gettingStarted}}></p>
                </div>
                <div className="help-entry">
                    <h3 className="fourDN-section-title">Metadata structure</h3>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.metadataStructure1}}></p>
                    <SlideCarousel />
                    <p className="fourDN-content" id="data-submission" dangerouslySetInnerHTML={{__html: statics.metadataStructure2}}></p>
                </div>
                <div className="help-entry">
                    <h3 id="rest-api" className="fourDN-section-title">Data submission via spreadsheet</h3>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.submissionXLS}}></p>
                </div>
                <div className="help-entry">
                    <h3 className="fourDN-section-title">REST API</h3>
                    <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.restAPI}}></p>
                </div>
            </div>
        );
    }
});

var SlideCarousel = React.createClass({
    getInitialState() {
        return {
            index: 0,
            slideTitles: ["Slide01.png", "Slide02.png", "Slide03.png", "Slide04.png", "Slide05.png", "Slide06.png", "Slide07.png", "Slide08.png", "Slide10.png", "Slide11.png", "Slide12.png"]
        };
    },
    handleForward() {
        var nextIdx;
        if (this.state.index + 1 === this.state.slideTitles.length) {
            nextIdx = 0;
        }else{
            nextIdx = this.state.index + 1;
        }
        this.setState({
            index: nextIdx
        });
    },
    handleBackward() {
        var nextIdx;
        if (this.state.index - 1 < 0) {
            nextIdx = this.state.slideTitles.length - 1;
        }else{
            nextIdx = this.state.index - 1;
        }
        this.setState({
            index: nextIdx
        });
    },
    render: function() {
        var slideName = "/static/img/Metadata_structure_slides/" + this.state.slideTitles[this.state.index];
        var slide = <img width={720} height={540} alt="720x540" src={slideName}></img>;
        return(
            <div className="slide-display">
                <div className="slide-controls">
                    <Button bsSize="xsmall" onClick={this.handleBackward}>Previous</Button>
                    <Button bsSize="xsmall" onClick={this.handleForward}>Next</Button>
                </div>
                {slide}
            </div>
        );
    }
});
