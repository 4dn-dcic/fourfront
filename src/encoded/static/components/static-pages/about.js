// Render a simple static about page

import React from 'react';
import PropTypes from 'prop-types';
import { content_views } from '../globals';
import { Wrapper } from './static-page-base';

export default class AboutPage extends React.Component {

    static PropTypes = {
        'context' : PropTypes.shape({
            "content" : PropTypes.shape({
                "dcic" : PropTypes.string,
                "acknowledgements" : PropTypes.string,
                "funding" : PropTypes.string
            }).isRequired
        }).isRequired
    }

    render() {
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

}

content_views.register(AboutPage, 'AboutPage');
