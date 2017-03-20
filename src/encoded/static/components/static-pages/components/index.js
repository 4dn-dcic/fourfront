'use strict';

/**
 * A collection of components which are most specific to static pages.
 * 
 * @module static-pages/components
 */

/**
 * Component which shows currents announcements.
 * Announcements are (temporarily) currently stored in src/encoded/static/data/announcements_data.js.
 * 
 * @member
 * @namespace
 * @type {Component}
 * @prop {string} className - Outer <div> element's className
 * @prop {string} id - Outer <div> element's id attribute.
 */
module.exports.Announcements = require('./Announcements');

/**
 * Generates an inline <span> React element which fetches a count from the back-end.
 * 
 * @deprecated
 * @member
 * @namespace
 * @type {Component}
 * @example
 * <caption>Previous usage in View module:static-pages/home</caption>
 * render : function(){
 * ...
 * var experiment4DNBanner = <BannerEntry session={this.props.session} text='experiments' defaultFilter="4DN" destination="/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all" fetchLoc='/search/?type=Experiment&award.project=4DN&format=json'/>;
 * var experimentExtBanner = <BannerEntry session={this.props.session} text='experiments' defaultFilter="External" destination="/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all" fetchLoc='/search/?type=Experiment&award.project=External&format=json'/>;
 * var biosourceBanner = <BannerEntry session={this.props.session} text='cell types' destination='/search/?type=Biosource' fetchLoc='/search/?type=Biosource&format=json'/>;
 * 
 * return (
 *     ...
 *     <div>
 *         <div className="fourDN-banner text-left">
 *             <h1 className="page-title" style={{ fontSize : '3.25rem' }}>4DN Data Portal</h1>
 *             <h4 className="text-300 col-sm-8" style={{ float: 'none', padding : 0 }}>
 *                 The portal currently hosts {experiment4DNBanner} from
 *                 the 4DN network and {experimentExtBanner} from other
 *                 sources over {biosourceBanner}.
 *             </h4>
 *         </div>
 *     </div>
 *     ...
 */
module.exports.BannerEntry = require('./BannerEntry');