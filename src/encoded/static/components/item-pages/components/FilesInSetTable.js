'use strict';

var React = require('react');
var { Button } = require('react-bootstrap');
var url = require('url');

/** These props are shared between FilesInSetTable and FilesInSetTable.Small */
var propTypes = {
    'files' : React.PropTypes.arrayOf(React.PropTypes.shape({
        //'link_id'         : React.PropTypes.string.isRequired,
        'accession'       : React.PropTypes.string,
        'display_title'   : React.PropTypes.string,
        'attachment'      : React.PropTypes.shape({ 'download' : React.PropTypes.string }).isRequired,
        'description'     : React.PropTypes.string.isRequired

    })).isRequired
};

/**
 * Component for displaying Files in a set.
 * 
 * @memberof module:item-pages/components
 * @namespace FilesInSetTable
 * @type {Component}
 */
var FilesInSetTable = module.exports = React.createClass({

    /**
     * Static functions which help to render or parse File objects.
     * 
     * @memberof module:item-pages/components.FilesInSetTable
     * @namespace
     * @type {Object}
     */
    statics : {

        /**
         * Convert a link_id, if one exists on param 'object', to an '@id' link.
         * 
         * @param {Object} object - Must have a 'link_id' or '@id' property. Else will return null.
         * @returns {string|null} The Item's '@id'.
         */
        atIdFromObject : function(object){
            return (
                object && typeof object === 'object' &&
                    ((object.link_id && object.link_id.replace(/~/g, "/")) || object['@id']) 
                ) || null;
        },

        /** 
         * Generate a download link for a file attachment from a fileObject, which should represent a (partial) JSON of a file Item.
         * 
         * @param {Object} fileObject - Object must have a link_id or an @id property, as well as an 'attachment' property containing 'href'.
         * @returns {string} URL to download file attachment from.
         */
        attachmentDownloadLinkFromFile : function(fileObject){
            var downloadLinkExists = true;
            var atId = FilesInSetTable.atIdFromObject(fileObject);
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
        },

        /**
         * Converts a file-type or mime-type string into a FontAwesome icon className suffix.
         * 
         * @param {string} fileType - MIMEType to get icon className suffix for.
         * @returns {string|null} The suffix to append to "fa-" or "icon-" CSS class.
         */
        iconClassFromFileType : function(fileType){
            if (typeof fileType !== 'string') return null;
            fileType = fileType.toLowerCase();
            if (fileType.indexOf('zip') > -1){
                return 'file-zip-o';
            } else if ( fileType.indexOf('pdf') > -1 ){
                return 'file-pdf-o';
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
        },

        /**
         * Show the submitter's name and link to their profile.
         * If passed a props.labName and props.showLabName == true,
         * then will show that labName instead. Use for when hovering over the lab icon, for example.
         * 
         * Also shows props.labName if no props.user object supplied.
         * 
         * @memberof module:item-pages/components.FilesInSetTable
         * @namespace
         * @type {Component}
         * @prop {Object} user
         */
        SubmitterLink : React.createClass({

            render : function(){
                var user = this.props.user;
                var labName = this.props.labName;
                
                if (labName && (this.props.showLabName || !user)){
                    return (
                        <span>
                            <small>Lab: </small>{ labName }
                        </span>)
                    ;
                }

                var atId = FilesInSetTable.atIdFromObject(user);
                var title = user.display_title || user.title || (typeof user === 'string' ? user : null) || "Submitter";
                if (!atId && title === 'Submitter') return null;
                else if (!atId) return title;
                
                return (
                    <span>
                        <a href={atId}>{ title }</a>
                    </span>
                );
            }

        }),

        /**
         * Renders a "users group" icon which links to submitter's lab.
         * 
         * @memberof module:item-pages/components.FilesInSetTable
         * @namespace
         * @type {Component}
         * @prop {Object} lab - Lab object.
         * @prop {function} onMouseEnter - Callback for cursor entering icon.
         * @property {function} onMouseLeave - Callback for cursor leaving icon.
         */
        LabIcon : React.createClass({

            noLab : function(){
                return (
                    <span className="lab-icon no-lab">
                        <i className="icon icon-users"/>
                    </span>
                );
            },

            render : function(){
                var lab = this.props.lab;
                if (!lab) return this.noLab();
                var atId = FilesInSetTable.atIdFromObject(lab);
                if (!atId) {
                    console.error("We need lab with link_id or @id.");
                    return this.noLab();
                }
                return (
                    <a 
                        href={atId}
                        className="lab-icon"
                        onMouseEnter={this.props.onMouseEnter}
                        onMouseLeave={this.props.onMouseLeave}
                    >
                        <i className="icon icon-users"/>
                    </a>
                );
            },

        }),

        /**
         * Renders a div element with '.row' Bootstrap class, containing details about a file.
         * Meant to fill a large-width area, but scales down responsively for smaller screen sizes.
         * 
         * @memberof module:item-pages/components.FilesInSetTable
         * @namespace
         * @type {Component}
         */
        FileItemRow : React.createClass({

            getInitialState : function(){
                return {
                    'showLabName' : false
                };
            },

            render : function(){
                var file = this.props.file;
                var atId = FilesInSetTable.atIdFromObject(file);
                var title = file.display_title || file.accession;
                var downloadHref = FilesInSetTable.attachmentDownloadLinkFromFile(file);
                var iconClass = FilesInSetTable.iconClassFromFileType(file && file.attachment && file.attachment.type);
                return (
                    <div className="row" key={atId || title}>
                        <div className="col-xs-9 col-md-2 col-lg-2 title">
                            <h6 className="accession">
                                { atId ? <a href={atId}>{ title }</a> : title }
                            </h6>
                        </div>

                        <div className="col-xs-3 col-md-1 text-right download-button pull-right">
                            <Button bsSize="small" href={ downloadHref } download disabled={!downloadHref}>
                                <i className={"icon icon-" + (iconClass || 'download')}/>
                            </Button>
                        </div>

                        <div className="col-xs-12 col-md-5 col-lg-6 description">
                            { file.description }
                        </div>

                        <div className="col-xs-1 col-md-1 lab">
                            <FilesInSetTable.LabIcon
                                lab={file && file.lab}
                                onMouseEnter={ ()=> this.setState({ showLabName : true }) }
                                onMouseLeave={ ()=> this.setState({ showLabName : false }) }
                            />
                        </div>

                        <div className="col-xs-11 col-md-3 col-lg-2 submitter">
                            <FilesInSetTable.SubmitterLink 
                                user={file && file.submitted_by}
                                labName={file && file.lab && file.lab.display_title}
                                showLabName={this.state.showLabName}
                            />
                        </div>
                        
                        <div className="col-xs-12 col-md-12 divider-column">
                            <div className="divider"/>
                        </div>
                    </div>
                );
            }
        }),

        /**
         * @memberof module:item-pages/components.FilesInSetTable
         * @namespace
         * @type {Component}
         */
        Small : React.createClass({

            propTypes : propTypes,

            render : function(){
                return (
                    <div className="files-in-set-table">
                        { 
                            this.props.files.map(function(file, i){
                                var atId = FilesInSetTable.atIdFromObject(file);
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
        })

    },

    propTypes : propTypes,

    header : function(){
        return (
            <div className="row hidden-xs hidden-sm header-row">
                <div className="col-xs-9 col-md-2 col-lg-2 title">
                    Accession
                </div>

                <div className="col-xs-3 col-md-1 text-right download-button-title pull-right">
                    <i className={"icon icon-download"}/>
                </div>

                <div className="col-xs-12 col-md-5 col-lg-6  description">
                    Description
                </div>

                <div className="col-xs-1 col-md-1 lab">
                    &nbsp;
                </div>

                <div className="col-xs-12 col-md-3 col-lg-2 submitter">
                    Submitter
                </div>
                
                <div className="col-xs-12 col-md-12 divider-column">
                    <div className="divider"/>
                </div>
            </div>
        );
    },

    render : function(){
        return (
            <div className="files-in-set-table">
                { this.header() }
                { this.props.files.map((file, i)=> <FilesInSetTable.FileItemRow file={file} />) }
            </div>
        );
    }

});