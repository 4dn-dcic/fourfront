'use strict';

/**
 * A collection of components which are most specific to static pages.
 * 
 * @module static-pages/components
 */

export { CSVMatrixView, CSVParsingUtilities } from './CSVMatrixView';
export { Announcements } from './Announcements';
export { TableOfContents, MarkdownHeading, NextPreviousPageSection, HeaderWithLink } from './TableOfContents';
export { StackedBlockVisual, sumPropertyFromList, groupByMultiple, cartesian } from './StackedBlockVisual';
export { BasicStaticSectionBody } from './BasicStaticSectionBody';
import * as p from './placeholders';
export const placeholders = p;
