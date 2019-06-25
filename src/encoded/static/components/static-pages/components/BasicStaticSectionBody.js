'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { object, analytics, isServerSide } from './../../util';
import { compiler } from 'markdown-to-jsx';
import { replaceString as replacePlaceholderString } from './../placeholders';



export class BasicStaticSectionBody extends React.PureComponent {

    static propTypes = {
        "content" : PropTypes.string.isRequired,
        "filetype" : PropTypes.string,
        "element" : PropTypes.string.isRequired,
        "markdownCompilerOptions" : PropTypes.any
    };

    static defaultProps = {
        "filetype" : "md",
        "element" : "div"
    };

    render(){
        const { content, filetype, element, markdownCompilerOptions } = this.props;
        const passedProps = _.omit(this.props, 'content', 'filetype', 'children', 'element', 'markdownCompilerOptions');

        if (filetype === 'md' && typeof content === 'string'){
            return React.createElement(element, passedProps, compiler(content, markdownCompilerOptions || undefined) );
        } else if (filetype === 'html' && typeof content === 'string'){
            return React.createElement(element, passedProps, object.htmlToJSX(content));
        } else if (filetype === 'jsx' && typeof content === 'string'){
            return replacePlaceholderString(content.trim());
        } else if (filetype === 'txt' && typeof content === 'string' && content.slice(0,12) === 'placeholder:'){
            // Deprecated older method - to be removed once data.4dn uses filetype=jsx everywhere w/ placeholder
            return replacePlaceholderString(content.slice(12).trim());
        } else {
            return React.createElement(element, passedProps, content);
        }
    }

}
