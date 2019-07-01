'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import { compiler } from 'markdown-to-jsx';
import { MarkdownHeading } from '@hms-dbmi-bgm/shared-portal-components/src/components/static-pages/TableOfContents';
import { console, object, isServerSide } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { StaticPageBase } from '@hms-dbmi-bgm/shared-portal-components/src/components/static-pages/StaticPageBase';
import { replaceString as replacePlaceholderString } from './placeholders';

/** NOT SHARED */

/**
 * Converts context.content into different format if necessary and returns copy of context with updated 'content'.
 * Currently only converts Markdown content (if a context.content[] item has 'filetype' === 'md'). Others may follow.
 *
 * @param {Object} context - Context provided from back-end, including all properties.
 */
export const parseSectionsContent = memoize(function(context){

    const markdownCompilerOptions = {
        // Override basic header elements with MarkdownHeading to allow it to be picked up by TableOfContents
        'overrides' : _.object(_.map(['h1','h2','h3','h4', 'h5', 'h6'], function(type){ // => { type : { component, props } }
            return [type, {
                'component' : MarkdownHeading,
                'props'     : { 'type' : type }
            }];
        }))
    };

    function parse(section){

        if (Array.isArray(section['@type']) && section['@type'].indexOf('StaticSection') > -1){
            // StaticSection Parsing
            if (section.filetype === 'md' && typeof section.content === 'string'){
                section =  _.extend({}, section, {
                    'content' : compiler(section.content, markdownCompilerOptions)
                });
            } else if (section.filetype === 'html' && typeof section.content === 'string'){
                section =  _.extend({}, section, {
                    'content' : object.htmlToJSX(section.content)
                });
            } // else: retain plaintext or HTML representation
        } else if (Array.isArray(section['@type']) && section['@type'].indexOf('JupyterNotebook') > -1){
            // TODO
        }

        return section;
    }

    if (!Array.isArray(context.content)) throw new Error('context.content is not an array.');

    return _.extend(
        {}, context, {
            'content' : _.map(
                _.filter(context.content || [], function(section){ return section && (section.content || section.viewconfig) && !section.error; }),
                parse
            )
        });
});



export const StaticEntryContent = React.memo(function StaticEntryContent(props){
    const { section, className } = props;
    const { content = null, options = {}, filetype = null } = section;
    let renderedContent;

    if (!content) return null;

    // Handle JSX
    if (typeof content === 'string' && filetype === 'jsx'){
        renderedContent = replacePlaceholderString(content.trim(), _.omit(props, 'className', 'section', 'content'));
    } else if (typeof content === 'string' && filetype === 'txt' && content.slice(0,12) === 'placeholder:'){
        // Deprecated older method - to be removed once data.4dn uses filetype=jsx everywhere w/ placeholder
        renderedContent = replacePlaceholderString(content.slice(12).trim(), _.omit(props, 'className', 'section', 'content'));
    } else {
        renderedContent = content;
    }

    const cls = "section-content clearfix " + (className? ' ' + className : '');

    return <div className={cls}>{ renderedContent }</div>;
});


/**
 * This component shows an alert on mount if have been redirected from a different page, and
 * then renders out a list of StaticEntry components within a Wrapper in its render() method.
 * May be used by extending and then overriding the render() method.
 */
export default class StaticPage extends React.PureComponent {

    static Wrapper = StaticPageBase.Wrapper

    render(){
        return <StaticPageBase {...this.props} childComponent={StaticEntryContent} contentParseFxn={parseSectionsContent} />;
    }
}
