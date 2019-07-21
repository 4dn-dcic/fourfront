'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { Collapse } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/Collapse';

/**
 * A collapsible panel that is meant to be shown near top of Item views.
 * Is meant to display a grid of Item properties, rendered out via `OverViewBodyItem`s.
 * However the component may be extended to display other things, e.g. as `ExpandableStaticHeader` does.
 */
export class OverviewHeadingContainer extends React.Component {

    static propTypes = {
        'onFinishOpen' : PropTypes.func,
        'onStartOpen' : PropTypes.func,
        'onFinishClose' : PropTypes.func,
        'onStartClose' : PropTypes.func
    };

    static defaultProps = {
        'className'     : 'with-background mb-3 mt-1',
        'defaultOpen'   : true,
        'titleElement'  : 'h4',
        'title'         : 'Properties',
        'prependTitleIcon' : false,
        'prependTitleIconFxn' : function(open, props){
            return <i className={"expand-icon icon fas icon-" + (open ? 'minus' : 'plus')} data-tip={open ? 'Collapse' : 'Expand'}/>;
        }
    };

    constructor(props){
        super(props);
        this.toggle = _.throttle(this.toggle.bind(this), 500);
        this.renderInner = this.renderInner.bind(this);
        this.renderInnerBody = this.renderInnerBody.bind(this);
        this.state = { 'open' : props.defaultOpen, 'closing' : false };
    }

    toggle(){
        this.setState(function(currState){
            var open    = !currState.open,
                closing = !open;
            return { open, closing };
        }, ()=>{
            setTimeout(()=>{
                this.setState(function(currState){
                    if (!currState.open && currState.closing){
                        return { 'closing' : false };
                    } else if (currState.open){
                        ReactTooltip.rebuild();
                    }
                    return null;
                });
            }, 750);
        });
    }

    renderTitle(){
        var { title, prependTitleIcon, prependTitleIconFxn } = this.props, open = this.state.open;
        return (
            <span>
                { prependTitleIcon && prependTitleIconFxn ? prependTitleIconFxn(open, this.props) : null }
                { title } &nbsp;<i className={"icon fas icon-angle-right" + (open ? ' icon-rotate-90' : '')}/>
            </span>
        );
    }

    renderInner(){
        var { open, closing } = this.state;
        return (
            <div className="inner">
                <hr className="tab-section-title-horiz-divider"/>
                { open || closing ? this.renderInnerBody() : <div/> }
            </div>
        );
    }

    renderInnerBody(){
        return <div className="row overview-blocks" children={this.props.children}/>;
    }

    render(){
        var { title, titleElement, titleClassName, titleTip, className, onStartOpen, onStartClose, onFinishClose, onFinishOpen } = this.props,
            open        = this.state.open,
            titleProps  = title && titleElement && {
                'className' : 'tab-section-title clickable with-accent' + (titleClassName ? ' ' + titleClassName : ''),
                'onClick'   : this.toggle,
                'data-tip'  : titleTip
            };

        return (
            <div className={"overview-blocks-header" + (open ? ' is-open' : ' is-closed') + (typeof className === 'string' ? ' ' + className : '')}>
                { title && titleElement ? React.createElement(titleElement, titleProps, this.renderTitle()) : null }
                <Collapse in={open} onEnter={onStartOpen} onEntered={onFinishOpen} onExit={onStartClose} onExited={onFinishClose} children={this.renderInner()} />
            </div>
        );
    }
}

