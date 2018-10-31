'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { object, analytics } from './../../util';
import { compiler } from 'markdown-to-jsx';
import { HiGlassPlainContainer } from '../../item-pages/components';
import * as store from './../../../store';


export class BasicUserContentBody extends React.PureComponent {

    constructor(props){
        super(props);
        this.state = { 'hasError' : false, 'errorInfo' : null };
    }

    componentDidCatch(err, info){
        this.setState({ 'hasError' : true, 'errorInfo' : info }, ()=>{
            var href = this.props.href;
            if (!href){
                var storeState = store && store.getState();
                href = storeState && storeState.href;
            }
            analytics.exception('Client Error - ' + href + ': ' + err, false);
        });
    }

    itemType(){
        var { context, itemType } = this.props;
        if (itemType && typeof itemType === 'string') return itemType;
        if (!Array.isArray(context['@type'])) throw new Error('Expected an @type on context.');
        if (context['@type'].indexOf('StaticSection') > -1){
            return 'StaticSection';
        } else if (context['@type'].indexOf('HiglassViewConfig') > -1){
            return 'HiglassViewConfig';
        } else {
            throw new Error('Unsupported Item type.');
        }
    }

    render(){
        var { context } = this.props;
        if (this.state.hasError){
            return (
                <div className="error">
                    <h4>Error parsing content.</h4>
                </div>
            );
        }

        var itemType = this.itemType();

        if (itemType === 'StaticSection') {
            return <BasicStaticSectionBody content={context.content} filetype={context.filetype}  />;
        } else if (itemType === 'HiglassViewConfig') {
            return <HiGlassPlainContainer viewConfig={context.viewconfig} />;
        } else {
            return (
                <div className="error">
                    <h4>Error determining Item type.</h4>
                </div>
            );
        }
    }

}


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
        var { content, filetype, element, compileOptions } = this.props,
            passedProps = _.omit(this.props, 'content', 'filetype', 'children', 'element', 'compileOptions');

        if (filetype === 'md'){
            return React.createElement(element, passedProps, compiler(content, compileOptions || undefined) );
        } else if (filetype === 'html' && typeof content === 'string'){
            return React.createElement(element, passedProps, object.htmlToJSX(content));
        } else {
            return React.createElement(element, passedProps, content );
        }
    }

}
