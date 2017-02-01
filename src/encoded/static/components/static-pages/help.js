// Render a simple static help page

var React = require('react');
var _ = require('underscore');
var StaticPageBase = require('./static-page-base');
var Button = require('react-bootstrap').Button;
var globals = require('../globals');

var HelpPage = module.exports = React.createClass({

    statics : {

        Entry : React.createClass({

            getDefaultProps : function(){
                return {
                    'section'   : null,
                    'content'   : null,
                    'entryType' : 'help',
                    'className' : 'text-justified'
                };
            },

            replacePlaceholder : function(placeholderString){
                if (placeholderString === '<SlideCarousel/>'){
                    return (<SlideCarousel />);
                }
                return placeholderString;
            },

            renderEntryContent : StaticPageBase.Entry.renderEntryContent,
            render : StaticPageBase.Entry.render
        })

    },

    propTypes : {
        context : React.PropTypes.shape({
            "title" : React.PropTypes.string,
            "content" : React.PropTypes.shape({
                "gettingStarted" : React.PropTypes.object,
                "metadataStructure1" : React.PropTypes.object,
                "metadataStructure2" : React.PropTypes.object,
                "restAPI" : React.PropTypes.object
            }).isRequired
        }).isRequired
    },

    entryRenderFxn : function(key, content){
        return (<HelpPage.Entry key={key} section={key} content={content} />);
    },

    getDefaultProps : StaticPageBase.getDefaultProps,
    parseSectionsContent : StaticPageBase.parseSectionsContent,
    renderSections  : StaticPageBase.renderSections,
    render          : StaticPageBase.render.base

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
