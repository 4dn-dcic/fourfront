'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { compiler } from 'markdown-to-jsx';

export class BasicStaticSectionBody extends React.PureComponent {

    static propTypes = {
        "content" : PropTypes.string.isRequired,
        "filetype" : PropTypes.string,
        "element" : PropTypes.string.isRequired,
        "compileOptions" : PropTypes.any
    }

    static defaultProps = {
        "filetype" : "md",
        "element" : "div",
        "compileOptions" : null
    }

    render(){
        var { content, filetype, element, compileOptions } = this.props;
        var passedProps = _.omit(this.props, 'content', 'filetype', 'children', 'element', 'compileOptions');
        if (filetype === 'md'){
            return React.createElement(element, passedProps, compiler(content, compileOptions || undefined) );
        } else if (filetype === 'html'){
            return React.createElement(element, _.extend(passedProps, { 'dangerouslySetInnerHTML' : { '__html' : content } }) );
        } else {
            return React.createElement(element, passedProps, content );
        }
    }

}
