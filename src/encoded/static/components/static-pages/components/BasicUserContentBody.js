'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { analytics } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { BasicStaticSectionBody } from '@hms-dbmi-bgm/shared-portal-components/src/components/static-pages/BasicStaticSectionBody';
import { OverviewHeadingContainer } from './../../item-pages/components/OverviewHeadingContainer';
import { replaceString as replacePlaceholderString } from './../placeholders';


/** THIS FILE NOT SHARED OR COMMON */
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

    /** Determines the item type from the context. */
    itemType(){
        var { context, itemType } = this.props;
        if (itemType && typeof itemType === 'string') return itemType;
        if (!Array.isArray(context['@type'])) throw new Error('Expected an @type on context.');
        if (context['@type'].indexOf('StaticSection') > -1){
            return 'StaticSection';
        } else {
            // TODO: Case for JupyterNotebook (?) and/or yet-to-be-created ones.
            throw new Error('Unsupported Item type.');
        }
    }

    render(){
        var { context, markdownCompilerOptions, parentComponentType } = this.props;
        if (this.state.hasError){
            return (
                <div className="error">
                    <h4>Error parsing content.</h4>
                </div>
            );
        }

        var itemType = this.itemType();

        if (itemType === 'StaticSection') {
            return (
                <BasicStaticSectionBody content={context.content} filetype={context.filetype}
                    markdownCompilerOptions={markdownCompilerOptions} placeholderReplacementFxn={replacePlaceholderString} />
            );
        } else {
            // TODO handle @type=JupyterHub?
            return (
                <div className="error">
                    <h4>Error determining Item type.</h4>
                </div>
            );
        }
    }

}



export class ExpandableStaticHeader extends OverviewHeadingContainer {

    static propTypes = {
        'context' : PropTypes.object.isRequired
    };

    static defaultProps = _.extend({}, OverviewHeadingContainer.defaultProps, {
        'className' : 'with-background mb-1 mt-1',
        'title'     : "Information",
        'prependTitleIconFxn' : function prependedIcon(open, props){
            if (!props.titleIcon) return null;
            return <i className={"expand-icon icon icon-fw icon-" + props.titleIcon} />;
        },
        'prependTitleIcon' : true
    });

    renderInnerBody(){
        const { context, href } = this.props;
        const { open } = this.state;

        return (
            <div className="static-section-header pt-1 clearfix">
                <BasicUserContentBody context={context} href={href} parentComponentType={ExpandableStaticHeader} />
            </div>
        );
    }
}
