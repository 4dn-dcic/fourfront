'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { object, analytics, isServerSide } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { BasicStaticSectionBody } from '@hms-dbmi-bgm/shared-portal-components/es/components/static-pages/BasicStaticSectionBody';
import { replaceString as placeholderReplacementFxn } from './../../static-pages/placeholders';
import { HiGlassAjaxLoadContainer, isHiglassViewConfigItem } from './../../item-pages/components/HiGlass';
import { OverviewHeadingContainer } from './../../item-pages/components/OverviewHeadingContainer';


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
        } else if (isHiglassViewConfigItem(context)){ // Func internally checks context['@type'].indexOf('HiglassViewConfig') > -1 also
            return 'HiglassViewConfig';
        } else {
            // TODO: Case for JupyterNotebook (?) and/or yet-to-be-created ones.
            throw new Error('Unsupported Item type.');
        }
    }

    render(){
        const { context, markdownCompilerOptions, parentComponentType, windowWidth } = this.props;
        if (this.state.hasError){
            return (
                <div className="error">
                    <h4>Error parsing content.</h4>
                </div>
            );
        }

        var itemType = this.itemType();

        if (itemType === 'StaticSection') {
            return <BasicStaticSectionBody content={context.content} filetype={context.filetype} markdownCompilerOptions={markdownCompilerOptions} windowWidth={windowWidth} placeholderReplacementFxn={placeholderReplacementFxn} />;
        } else if (itemType === 'HiglassViewConfig') {
            return (
                <React.Fragment>
                    <EmbeddedHiglassActions context={context} parentComponentType={parentComponentType || BasicUserContentBody} />
                    <HiGlassAjaxLoadContainer {..._.omit(this.props, 'context', 'higlassItem')} higlassItem={context} scale1dTopTrack={false} />
                </React.Fragment>
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


export const EmbeddedHiglassActions = React.memo(function EmbeddedHiglassActions(props){
    const { context, parentComponentType, showDescription, constrainDescription } = props;
    let cls = "btn btn-outline-dark pull-right extra-info-higlass-btn";

    if (parentComponentType === BasicUserContentBody) {
        cls += ' btn-sm';
    }

    return (
        // Styled as flexrow, which will keep btn-container aligned to right as long as the ".description" container is present.
        <div className="extra-info extra-info-for-higlass-display" {..._.omit(props, 'context', 'showDescription', 'parentComponentType', 'constrainDescription')}>
            <div className={"description" + (constrainDescription ? ' text-ellipsis-container' : '')} >
                { showDescription ? context.description : null }
            </div>
            <div className="btn-container">
                <a href={object.itemUtil.atId(context)} className={cls}
                    data-tip="Open HiGlass display to add other data">
                    <i className="icon icon-fw icon-eye fas"/>&nbsp;&nbsp;&nbsp;
                    Explore Data
                </a>
            </div>
        </div>
    );
});
EmbeddedHiglassActions.defaultProps = {
    'parentComponentType' : BasicUserContentBody,
    'showDescription' : true,
    'constrainDescription' : false
};


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

    renderInnerBody() {
        const { context, href, windowWidth } = this.props;
        const { open } = this.state;
        const isHiGlass = isHiglassViewConfigItem(context);

        return (
            <div className="static-section-header pt-1 clearfix">
                <BasicUserContentBody context={context} href={href} parentComponentType={ExpandableStaticHeader} windowWidth={windowWidth} />
            </div>
        );
    }
}
