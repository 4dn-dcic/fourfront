'use strict';

import React from 'react';
import { console } from './../util';
import { ItemDetailList } from './components';

/**
 * Fallback content_view for pages which are not specifically 'Items.
 * Renders out JSON.
 * 
 * @export
 * @class Item
 * @extends {React.Component}
 */
export default class FallbackView extends React.PureComponent {

    render() {
        var { context, schemas } = this.props;
        return (
            <div className="view-item mt-25">
                {typeof context.description == "string" ? <p className="description">{context.description}</p> : null}
                <ItemDetailList context={context} schemas={schemas} />
            </div>
        );
    }
}
