// Render a simple static help page

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { content_views } from '../globals';
import * as StaticPageBase from './static-page-base';
import { Button } from 'react-bootstrap';

class Entry extends React.Component {

    static defaultProps = {
        'section'   : null,
        'content'   : null,
        'entryType' : 'help',
        'className' : 'text-justified'
    }

    constructor(props){
        super(props);
        this.renderEntryContent = StaticPageBase.Entry.renderEntryContent.bind(this);
        this.render = StaticPageBase.Entry.render.bind(this);
    }

    replacePlaceholder(placeholderString){
        if (placeholderString === '<SlideCarousel/>'){
            return (<SlideCarousel />);
        }
        return placeholderString;
    }
}

export default class HelpPage extends React.Component {

    static propTypes = {
        'context' : PropTypes.shape({
            "title" : PropTypes.string,
            "content" : PropTypes.shape({
                "gettingStarted" : PropTypes.object,
                "metadataStructure1" : PropTypes.object,
                "metadataStructure2" : PropTypes.object,
                "restAPI" : PropTypes.object
            }).isRequired
        }).isRequired
    }

    static defaultProps = StaticPageBase.getDefaultProps()

    constructor(props){
        super(props);
        this.entryRenderFxn = this.entryRenderFxn.bind(this);
        this.parseSectionsContent = StaticPageBase.parseSectionsContent.bind(this);
        this.renderSections = StaticPageBase.renderSections.bind(this);
        this.render = StaticPageBase.render.base.bind(this);
    }

    entryRenderFxn(key, content, context){
        return (<Entry key={key} section={key} content={content} context={context} />);
    }

}


content_views.register(HelpPage, 'HelpPage');

var SlideCarousel = React.createClass({
    getInitialState() {
        return {
            index: 0,
            slideTitles: ["Slide01.png", "Slide02.png", "Slide03.png", "Slide04.png", "Slide05.png", "Slide06.png", "Slide07.png", "Slide08.png", "Slide09.png", "Slide10.png", "Slide11.png", "Slide12.png", "Slide13.png", "Slide14.png", "Slide15.png", "Slide16.png"]
        };
    },
    handleForward() {
        var nextIdx;
        if (this.state.index + 1 < this.state.slideTitles.length) {
            nextIdx = this.state.index + 1;
        }else{
            nextIdx = this.state.index;
        }
        this.setState({
            index: nextIdx
        });
    },
    handleBackward() {
        var nextIdx;
        if (this.state.index - 1 >= 0) {
            nextIdx = this.state.index - 1;
        }else{
            nextIdx = this.state.index;
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
                    <Button disabled={this.state.index == 0} bsSize="xsmall" onClick={this.handleBackward}>Previous</Button>
                    <Button disabled={this.state.index == this.state.slideTitles.length-1} bsSize="xsmall" onClick={this.handleForward}>Next</Button>
                </div>
                {slide}
            </div>
        );
    }
});
