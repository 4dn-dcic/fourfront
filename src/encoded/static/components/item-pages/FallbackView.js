'use strict';

import React from 'react';
import { ItemDetailList } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/ItemDetailList';

/**
 * Fallback content_view for pages which are not specifically 'Items.
 * Renders out JSON.
 */
export default class FallbackView extends React.PureComponent {
    render() {
        var { context, schemas } = this.props;
        return (
            <div className="view-item mt-25 container" id="content">
                {typeof context.description == "string" ? <p className="description">{context.description}</p> : null}
                <ItemDetailList context={context} schemas={schemas} />
            </div>
        );
    }
}
