'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, object, ajax } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { BasicUserContentBody, ExpandableStaticHeader } from './../components/BasicUserContentBody';
import { HiGlassLoadingIndicator } from './../../item-pages/components/HiGlass/HiGlassPlainContainer';

export class HiGlassEmbeddedInstance extends React.PureComponent {

    static defaultProps = {
        "headerElement": "h3",
        "headerClassName": "section-title"
    };

    static propTypes = {
        "uuid": PropTypes.string.isRequired,
        "headerElement": PropTypes.string,
        "headerClassName": PropTypes.string,
    };

    constructor(props) {
        super(props);
        this.state = {
            'loading': false,
            'higlassItem': null
        };
    }

    componentDidMount() {
        const { higlassItem } = this.state;
        const { uuid } = this.props;
        if (!higlassItem && uuid && typeof uuid === 'string' && uuid.length > 0) {
            this.setState({ 'loading': true }, () => {
                // Use the @id to get the item, then remove the loading message
                ajax.load('/higlass-view-configs/' + uuid, (r) => {
                    this.setState({ 'higlassItem': r, 'loading': false });
                });
            });
        }
    }

    render() {
        const { headerElement = 'h3', headerClassName = "section-title" } = this.props;
        const { higlassItem, loading } = this.state;
        // If HiGlass item is loaded, then display viewer
        if (higlassItem) {
            const { title, options: { collapsible: isCollapsible = false, default_open = true } = {} } = higlassItem;
            const headerProps = { className: headerClassName };
            return (
                <React.Fragment>
                    {title && !isCollapsible ? React.createElement(headerElement, headerProps, title) : null}
                    {
                        isCollapsible ?
                            <ExpandableStaticHeader context={higlassItem} defaultOpen={default_open} title={title} href={null} titleElement={headerElement} titleTip={higlassItem.description} />
                            : <BasicUserContentBody context={higlassItem} href={null} />
                    }
                </React.Fragment>
            );
        }
        // If we're loading, show a loading screen
        if (loading) {
            return <div className="text-center"><HiGlassLoadingIndicator title="Loading" /></div>;
        }
        return null;
    }
}