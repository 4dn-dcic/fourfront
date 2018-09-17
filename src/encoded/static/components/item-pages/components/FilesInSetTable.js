'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import url from 'url';
import { console, object } from './../../util';



/**
 * Show the submitter's name and link to their profile.
 * If passed a props.labName and props.showLabName == true,
 * then will show that labName instead. Use for when hovering over the lab icon, for example.
 * 
 * Also shows props.labName if no props.user object supplied.
 * 
 * @memberof module:item-pages/components.FilesInSetTable
 * @class SubmitterLink
 * @type {Component}
 * @prop {Object} user - User object.
 * @prop {Object} user.display_title - User's name to display.
 * @prop {string} labName - Name of Lab to show if props.showLabName is true.
 * @prop {boolean} [showLabName=false] - Show lab name instead of props.user.display_title if true.
 */
class SubmitterLink extends React.Component {

    render (){
        var user = this.props.user;
        var labName = this.props.labName;
        
        if (labName && (this.props.showLabName || !user)){
            return (
                <span>
                    <small>Lab: </small>{ labName }
                </span>)
            ;
        }

        var atId = object.atIdFromObject(user);
        var title = user.display_title || user.title || (typeof user === 'string' ? user : null) || "Submitter";
        if (!atId && title === 'Submitter') return null;
        else if (!atId) return title;
        
        return (
            <span>
                <a href={atId}>{ title }</a>
            </span>
        );
    }

}


/**
 * Renders a "users group" icon which links to submitter's lab.
 * 
 * @prop {Object} lab - Lab object.
 * @prop {function} onMouseEnter - Callback for cursor entering icon.
 * @prop {function} onMouseLeave - Callback for cursor leaving icon.
 */
class LabIcon extends React.Component {

    static defaultProps = {
        onMouseEnter : null,
        onMouseLeave : null
    }

    noLab(){
        return (
            <span className="lab-icon no-lab">
                <i className="icon icon-users"/>
            </span>
        );
    }

    render(){
        var lab = this.props.lab;
        if (!lab) return this.noLab();
        var atId = object.atIdFromObject(lab);
        if (!atId) {
            console.error("We need lab with link_id or @id.");
            return this.noLab();
        }
        return (
            <a 
                href={atId}
                className="lab-icon inline-block"
                onMouseEnter={this.props.onMouseEnter}
                onMouseLeave={this.props.onMouseLeave}
                data-tip={lab.display_title}
            >
                <i className="icon icon-users"/>
            </a>
        );
    }

}

/**
 * Renders a div element with '.row' Bootstrap class, containing details about a file.
 * Meant to fill a large-width area, but scales down responsively for smaller screen sizes.
 */
export class FileItemRow extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            'showLabName' : false
        };
    }

    render(){
        var file = this.props.file;
        var atId = object.atIdFromObject(file);
        var title = file.display_title || file.accession;

        var fileDownloadHref = (file && file.href) || null;
        var attachmentDownloadHref = FilesInSetTable.attachmentDownloadLinkFromFile(file);
        
        var fileItemClass = FilesInSetTable.iconClassFromFileType(file && file.file_format && (file.file_format.file_format || file.file_format.display_title));
        var attachmentIconClass = FilesInSetTable.iconClassFromFileType(file && file.attachment && file.attachment.type);

        return (
            <div className="row" key={atId || title}>
                <div className="col-xs-9 col-md-2 col-lg-2 title">
                    <h6 className="accession">
                        { atId ? <a href={atId}>{ title }</a> : title }
                    </h6>
                </div>

                <div className="col-xs-3 col-md-2 text-right download-button pull-right">
                    <Button className="button-dl-file" bsStyle="primary" bsSize="small" href={ fileDownloadHref } download disabled={!fileDownloadHref}>
                        <i className={"icon icon-" + (fileItemClass) }/>
                        { '\u00A0  Download' }
                    </Button>
                    <Button
                        className={"button-dl-doc" + (!attachmentDownloadHref ? ' disabled' : '')}
                        bsStyle="default"
                        bsSize="small"
                        href={ attachmentDownloadHref }
                        download
                        disabled={!attachmentDownloadHref}
                        children={<i className={"icon icon-" + (attachmentIconClass || 'file-o')}/>}
                    />
                </div>

                <div className="col-xs-12 col-md-4 col-lg-5 description">
                    { file.description }
                </div>

                <div className="col-xs-1 col-md-1 lab">
                    <LabIcon
                        lab={file && file.lab}
                    />
                </div>

                <div className="col-xs-11 col-md-3 col-lg-2 submitter">
                    <SubmitterLink 
                        user={file && file.submitted_by}
                    />
                </div>
                
                <div className="col-xs-12 col-md-12 divider-column">
                    <div className="divider"/>
                </div>
            </div>
        );
    }
}


/** These props are shared between FilesInSetTable and FilesInSetTable.Small */
const propTypes = {
    'files' : PropTypes.arrayOf(PropTypes.shape({
        //'link_id'         : PropTypes.string.isRequired,
        'accession'       : PropTypes.string,
        'display_title'   : PropTypes.string,
        'attachment'      : PropTypes.shape({ 'download' : PropTypes.string }).isRequired,
        'description'     : PropTypes.string.isRequired
    })).isRequired
};


/**
 * Small version of the full-width FilesInSetTable. Used for default item view page SubIPanels.
 */
class Small extends React.Component {

    static propTypes = propTypes

    render(){
        return (
            <div className="files-in-set-table smaller-version">
                { 
                    this.props.files.map(function(file, i){
                        var atId = object.atIdFromObject(file);
                        var title = file.display_title || file.accession;
                        var downloadHref = FilesInSetTable.attachmentDownloadLinkFromFile(file);
                        return (
                            <div className="row" key={atId || title || i}>
                                <div className="col-xs-12 col-md-4 title">
                                    <h6 className="text-500">
                                        { atId ? <a href={atId}>{ title }</a> : title }
                                    </h6>
                                </div>
                                <div className="col-xs-12 col-md-6 description">
                                    { file.description }
                                </div>
                                <div className="col-xs-12 col-md-2 text-right download-button">
                                    <Button bsSize="small" href={ downloadHref } download disabled={!downloadHref}>
                                        <i className="icon icon-download"/>
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        );
    }
}


/**
 * Component for displaying Files from a list.
 *
 * @prop {Object[]} files - List of file objects, e.g. a FileCalbirationSet's 'files_in_set' property.
 */
export class FilesInSetTable extends React.Component {

    static Small = Small

    static getTabObject(context, title, schemas = null){
        title = title || 'Files in Set';
        return {
            tab : <span><i className="icon icon-list-ul icon-fw"/> { title }</span>,
            key : 'files_in_set',
            content : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>{ title }</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <FilesInSetTable files={context.files_in_set}/>
                </div>
            )
        };
    }

    /** 
     * Generate a download link for a file attachment from a fileObject, which should represent a (partial) JSON of a file Item.
     * 
     * @param {Object} fileObject - Object must have a link_id or an @id property, as well as an 'attachment' property containing 'href'.
     * @returns {string} URL to download file attachment from.
     */
    static attachmentDownloadLinkFromFile(fileObject){
        var downloadLinkExists = true;
        var atId = object.atIdFromObject(fileObject);
        var downloadHref = (fileObject && fileObject.attachment && fileObject.attachment.href) || null;
        if (!downloadHref) return null;

        if (typeof downloadHref === 'string' && downloadHref.charAt(0) !== '/'){
            // Assume relative link, relative to Item not this set however.
            if (atId){
                var fileItemURLPath = url.parse(atId).pathname;
                return fileItemURLPath + (fileItemURLPath.slice(-1) === '/' ? '' : '/') + downloadHref;
            } else {
                return null;
            }
        } else if (typeof downloadHref === 'string') {
            return downloadHref;
        }

        return null;
    }

    /**
     * Converts a file-type or mime-type string into a FontAwesome icon className suffix.
     * 
     * @param {string} fileType - MIMEType to get icon className suffix for.
     * @returns {string|null} The suffix to append to "fa-" or "icon-" CSS class.
     */
    static iconClassFromFileType(fileType){
        if (typeof fileType !== 'string') return 'file-o';
        fileType = fileType.toLowerCase();
        if (fileType.indexOf('zip') > -1){
            return 'file-zip-o';
        } else if ( fileType.indexOf('pdf') > -1 ){
            return 'file-pdf-o';
        } else if ( fileType.indexOf('doc') > -1 ){
            return 'file-word-o';
        } else if (
            fileType.indexOf('txt') > -1 ||
            fileType.indexOf('tex') > -1
        ){
            return 'file-text-o';
        } else if (
            fileType.indexOf('xls') > -1 ||
            fileType.indexOf('csv') > -1 ||
            fileType.indexOf('tsv') > -1
        ){
            return 'file-excel-o';
        } else if (
            fileType.indexOf('png') > -1 ||
            fileType.indexOf('tiff') > -1 ||
            fileType.indexOf('jpg') > -1 ||
            fileType.indexOf('jpeg') > -1 ||
            fileType.indexOf('svg') > -1
        ){
            return 'file-picture-o';
        } else {
            return 'file-o';
        }
    }

    static propTypes = propTypes

    /**
     * Renders heading with titles for table on medium and large width screens.
     * 
     * @returns {JSX.Element} <div> element
    */
    header(){
        return (
            <div className="row hidden-xs hidden-sm header-row">
                <div className="col-xs-9 col-md-2 col-lg-2 title">
                    Accession
                </div>

                <div className="col-xs-3 col-md-2 text-right download-button-title pull-right">
                    {/* <i className="icon icon-download"/> */}
                    <span className="file">Image Files</span>
                    <span className="docs">Doc</span>
                </div>

                <div className="col-xs-12 col-md-4 col-lg-5  description">
                    Description
                </div>

                <div className="col-xs-1 col-md-1 lab" style={{ paddingRight : 6 }}>
                    Lab
                </div>

                <div className="col-xs-12 col-md-3 col-lg-2 submitter">
                    Submitter
                </div>
                
                <div className="col-xs-12 col-md-12 divider-column">
                    <div className="divider"/>
                </div>
            </div>
        );
    }

    render(){
        return (
            <div className="files-in-set-table">
                { this.header() }
                { this.props.files.map((file, i)=> <FileItemRow file={file} key={file.link_id || i} />) }
            </div>
        );
    }

}
