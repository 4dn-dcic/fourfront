'use strict';

/**
 * A directory of methods and maybe a mini-component or two for common use.
 *
 * @module item-pages/components
 */


export { FormattedInfoBlock } from './FormattedInfoBlock';
export { ItemPageTitle } from './ItemPageTitle';

import * as ih from './ItemHeader';
export const ItemHeader = ih;

export { PartialList } from './PartialList';
export { ExternalReferenceLink } from './ExternalReferenceLink';
export { FilesInSetTable, FileItemRow } from './FilesInSetTable';
export { ItemFooterRow } from './ItemFooterRow';
export { Publications } from './Publications';
export { TabbedView } from './TabbedView';
export { ItemDetailList, Detail, TooltipInfoIconContainer } from './ItemDetailList';
export { AuditTabView } from './AuditTabView';
export { AttributionTabView } from './AttributionTabView';
export { WorkflowDetailPane, MetricsView, ViewMetricButton, FileDownloadButton } from './WorkflowDetailPane';
export { FlexibleDescriptionBox, FlexibleCharacterCountBox } from './FlexibleDescriptionBox';
