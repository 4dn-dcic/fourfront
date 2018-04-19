'use strict';

/**
 * A collection of components which are most specific to static pages.
 * 
 * @module static-pages/components
 */

export { CSVMatrixView, CSVParsingUtilities } from './CSVMatrixView';
export { Announcements } from './Announcements';
export { TableOfContents, MarkdownHeading, NextPreviousPageSection } from './TableOfContents';
export { StackedBlockVisual, sumPropertyFromList, groupByMultiple, cartesian } from './StackedBlockVisual';
import * as p from './placeholders';
export const placeholders = p;
