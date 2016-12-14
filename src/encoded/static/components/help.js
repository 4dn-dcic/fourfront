// Render a simple static help page

var React = require('react');
var Button = require('react-bootstrap').Button;
var globals = require('./globals');

var HelpPage = module.exports = React.createClass({

    propTypes : {
        context : React.PropTypes.shape({
            "content" : React.PropTypes.shape({
                "gettingStarted" : React.PropTypes.string,
                "metadataStructure1" : React.PropTypes.string,
                "metadataStructure2" : React.PropTypes.string,
                "restAPI" : React.PropTypes.string
            }).isRequired
        }).isRequired
    },

    getDefaultProps : function(){
        return {
            "context" : { "content" : {} }
        }
    },

    // TODO: fix ugly hack, wherein I set id in the h3 above actual spot because the usual way of doing anchors cut off entries
    render: function() {
        var c = this.props.context.content;
        return(
            <div className="static-page">

                <h1 className="page-title">Help</h1>

                <div className="help-entry">
                    <h3 id="metadata-structure" className="fourDN-header">Getting Started</h3>
                    <p className="fourDN-content text-justify" dangerouslySetInnerHTML={{__html: c.gettingStarted}}></p>
                </div>
                <div className="help-entry">
                    <h3 className="fourDN-header">Metadata Structure</h3>
                    <p className="fourDN-content text-justify" dangerouslySetInnerHTML={{__html: c.metadataStructure1}}></p>
                    <SlideCarousel />
                    <p className="fourDN-content text-justify" id="data-submission" dangerouslySetInnerHTML={{__html: c.metadataStructure2}}></p>
                </div>
                <div className="help-entry">
                    <h3 id="rest-api" className="fourDN-header">Data Submission via Spreadsheet</h3>
                    <p className="fourDN-content text-justify" dangerouslySetInnerHTML={{__html: c.submissionXLS}}></p>
                </div>
                <div className="help-entry">
                    <h3 className="fourDN-header">REST API</h3>
                    <p className="fourDN-content text-justify" dangerouslySetInnerHTML={{__html: c.restAPI}}></p>
                </div>
            </div>
        );
    }
});

globals.content_views.register(HelpPage, 'HelpPage');

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
