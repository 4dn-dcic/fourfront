'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { object, analytics, isServerSide } from './../../util';
import { BasicUserContentBody, ExpandableStaticHeader } from './BasicUserContentBody';



export const UserContentBodyList = React.memo(function UserContentBodyList(props){
    const { contents, headerElement, headerProps, allCollapsible, href, hideTitles } = props;
    if (!contents || !Array.isArray(contents) || contents.length === 0) return null;

    const renderedContent = _.filter(_.map(contents, function(c,i,all){
        if (!c || c.error) return null;

        // If props.allCollapsible is a boolean, let it override whatever section option is.
        var isCollapsible = (allCollapsible === true) || (allCollapsible !== false && c.options && c.options.collapsible);

        return (
            <div className="static-content-item" key={c.name || c.uuid || object.itemUtil.atId(c) || i}>
                { !hideTitles && c.title && !isCollapsible ? React.createElement(headerElement, headerProps, c.title) : null }
                { isCollapsible ?
                    <ExpandableStaticHeader context={c} defaultOpen={c.options.default_open} title={c.title} href={href} titleTip={c.description} />
                    :
                    <BasicUserContentBody context={c} href={href} />
                }
            </div>
        );
    }));

    return <div className="static-content-list">{ renderedContent }</div>;
});
UserContentBodyList.defaultProps = {
    'hideTitles'        : false,
    'headerElement'     : 'h4',
    'headerProps'       : {
        'className'         : 'text-500 mt-2'
    },
    'allCollapsible'    : null
};
