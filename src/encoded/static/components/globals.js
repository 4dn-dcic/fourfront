'use strict';

import Registry from '@hms-dbmi-bgm/shared-portal-components/es/components/navigation/components/Registry';
import { console, isServerSide } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

/**
 * Registry of views for Item pages, keyed by Item type.
 * To register a new view for a given `@type`, may do the following:
 *
 * @type {Registry}
 * @example content_views.register(SomeReactViewComponent, 'ItemType');
 */
export const content_views = new Registry();

/**
 * Registry of views for panels. Works similarly to `content_views`.
 * Currently not being used but may be at a future time/date.
 *
 * @type {Registry}
 */
export const panel_views = new Registry();



/**
 * Hostnames which are considered to be canonical for 4DN data.
 * If "current" hostname is not in this list, is presumed to be a development environment,
 * and minor visual changes, such as the test data warning banner, appear.
 *
 * @todo convert to a Set() ?
 * @type {Object.<number>}
 */
export const productionHost = {
    'www.data.4dnucleome.org':1,
    'data.4dnucleome.org':1,
    //'www.testportal.4dnucleome.org':1,
    //'testportal.4dnucleome.org':1,
    'fourfront-webdev.us-east-1.elasticbeanstalk.com':1,
};
