'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, object, ajax } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { BasicUserContentBody } from './../components/BasicUserContentBody';
import { HiGlassLoadingIndicator } from './../../item-pages/components/HiGlass/HiGlassPlainContainer';

export class HiGlassEmbeddedInstance extends React.PureComponent {

    static defaultProps = {
        "uuid": null
    };

    static propTypes = {
        "uuid": PropTypes.string.isRequired
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
        const { higlassItem, loading } = this.state;
        // If HiGlass item is loaded, then display viewer
        if (higlassItem) {
            return <BasicUserContentBody context={higlassItem} />;
        }
        // If we're loading, show a loading screen
        if (loading) {
            return <div className="text-center"><HiGlassLoadingIndicator title="Loading" /></div>;
        }
        return null;
    }
}