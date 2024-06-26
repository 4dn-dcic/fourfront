'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _, { forEach } from 'underscore';
import memoize from 'memoize-one';
import { compiler } from 'markdown-to-jsx';
import { domToReact } from 'html-react-parser';

import { MarkdownHeading, TableOfContents } from '@hms-dbmi-bgm/shared-portal-components/es/components/static-pages/TableOfContents';
import { console, object, isServerSide } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { StaticPageBase } from '@hms-dbmi-bgm/shared-portal-components/es/components/static-pages/StaticPageBase';

import { CSVMatrixView, EmbeddedHiglassActions } from './components';
import { HiGlassPlainContainer } from './../item-pages/components/HiGlass/HiGlassPlainContainer';
import { replaceString as replacePlaceholderString } from './placeholders';



/**
 * Converts context.content into different format if necessary and returns copy of context with updated 'content'.
 * Currently only converts Markdown content (if a context.content[] item has 'filetype' === 'md'). Others may follow.
 *
 * @param {Object} context - Context provided from back-end, including all properties.
 */
export const parseSectionsContent = memoize(function(context){

    const markdownCompilerOptions = {
        // Override basic header elements with MarkdownHeading to allow it to be picked up by TableOfContents
        'overrides' : _.object(_.map(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], function(type){ // => { type : { component, props } }
            return [type, {
                'component' : MarkdownHeading,
                'props'     : { 'type' : type }
            }];
        }))
    };

    const getTextContent = (domNode) => {
        let textContent = '';

        if (domNode.type === 'text') {
            textContent += domNode.data;
        } else if (domNode.type === 'tag') {
            forEach(domNode.children, (child) => {
                textContent += getTextContent(child);
            });
        }

        return textContent;
    };

    const jsxCompilerOptions = {
        replace: (domNode) => {
            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].indexOf(domNode.name) >= 0) {
                const title = getTextContent(domNode) || '';
                if (title.replace('-', '').trim().length === 0) {
                    return domNode;
                }
                const idToSet = TableOfContents.slugify(title);
                const props = object.attributesToProps(domNode.attribs);
                return <MarkdownHeading {...props} id={idToSet} type={domNode.name}>{domToReact(domNode.children)}</MarkdownHeading>;
            } else if (domNode.type === 'tag' && domNode.name === 'pre') {
                const children = _.pluck(domNode.children, 'data');
                const className = domNode.attribs.class;
                return (
                    <div style={{ position: 'relative' }}>
                        <object.CopyWrapper
                            value={children}
                            className={(className || '') + " mt-2"}
                            wrapperElement="pre"
                            whitespace={false} analyticsOnCopy maskAnalyticsValue={true}>
                            {children}
                        </object.CopyWrapper>
                    </div>
                );
            }
        }
    };

    function parse(section){

        if (Array.isArray(section['@type']) && section['@type'].indexOf('StaticSection') > -1){
            const { content, content_as_html, filetype } = section;
            // StaticSection Parsing
            if (filetype === 'md' && typeof content === 'string' && !content_as_html){
                section =  _.extend({}, section, {
                    'content' : compiler(content, markdownCompilerOptions)
                });
            } else if ((filetype === 'html' || filetype === 'rst' || filetype === 'md') && (typeof content_as_html === 'string' || typeof content === 'string')){
                const contentStr = (filetype === 'md') ? content_as_html : (content_as_html || content);
                section =  _.extend({}, section, {
                    'content' : object.htmlToJSX(contentStr, jsxCompilerOptions)
                });
            } // else: retain plaintext or HTML representation
        } else if (Array.isArray(section['@type']) && section['@type'].indexOf('HiglassViewConfig') > -1){
            // HiglassViewConfig Parsing
            if (!section.viewconfig) throw new Error('No viewconfig setup for this section.');
            let hiGlassComponentHeight;
            if (section.instance_height && section.instance_height > 0) {
                hiGlassComponentHeight = section.instance_height;
            }

            section =  _.extend({}, section, {
                'content' : (
                    <React.Fragment>
                        <EmbeddedHiglassActions context={section} style={{ marginTop : -10 }} />
                        <HiGlassPlainContainer viewConfig={section.viewconfig} mountDelay={4000} height={hiGlassComponentHeight} />
                    </React.Fragment>
                )
            });
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
    const { content = null, content_as_html = null, options = {}, filetype = null } = section;
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

    if (filetype === 'csv'){
        // Special case
        return <CSVMatrixView csv={renderedContent} options={options} />;
    } else {
        // Common case - markdown, plaintext, etc.
        return <div className={cls}>{ renderedContent }</div>;
    }
});


/**
 * This component shows an alert on mount if have been redirected from a different page, and
 * then renders out a list of StaticEntry components within a Wrapper in its render() method.
 * May be used by extending and then overriding the render() method.
 */
export default class StaticPage extends React.PureComponent {

    static Wrapper = StaticPageBase.Wrapper;

    render(){
        return <StaticPageBase {...this.props} childComponent={StaticEntryContent} contentParseFxn={parseSectionsContent} />;
    }
}
