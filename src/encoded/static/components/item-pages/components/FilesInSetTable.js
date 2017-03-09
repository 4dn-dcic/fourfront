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

var FilesInSetTable = module.exports = React.createClass({

    /**
     * Static functions which help to render or parse File objects.
     * @memberof module:item-pages/components.FilesInSetTable
     * @namespace
     */
    statics : {

        /**
         * Convert a link_id, if one exists on param 'object', to an '@id' link.
         * @param {Object} object - Must have a 'link_id' or '@id' property. Else will return null.
         * @returns {string|null} The File Item's '@id'.
         */
        atIdFromObject : function(object){
            return (
                object &&
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
         * @param {string} fileType - MIMEType to get icon className suffix for.
         * @returns {string|null} The suffix to append to "fa-" or "icon-" CSS class.
         */
        iconClassFromFileType : function(fileType){
            console.log(fileType);
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

        submitterLink : function(userObject){
            var atId = FilesInSetTable.atIdFromObject(userObject);
            var title = userObject.display_title || userObject.title || "Submitter";
            if (!atId && title === 'Submitter') return null;
            else if (!atId) return title;
            
            return (
                <span>
                    <a href={atId}>{ title }</a>
                </span>
            );
        },

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
                <div className="col-xs-9 col-md-3 col-lg-2 title">
                    Accession
                </div>

                <div className="col-xs-3 col-md-2 text-right download-button-title pull-right">
                    <i className={"icon icon-download"}/>
                </div>

                <div className="col-xs-12 col-md-4 col-lg-5 description">
                    Description
                </div>

                <div className="col-xs-12 col-md-3 col-lg-3 submitter">
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
                { 
                    this.props.files.map(function(file, i){
                        var atId = FilesInSetTable.atIdFromObject(file);
                        var title = file.display_title || file.accession;
                        var downloadHref = FilesInSetTable.attachmentDownloadLinkFromFile(file);
                        var iconClass = FilesInSetTable.iconClassFromFileType(file && file.attachment && file.attachment.type);
                        return (
                            <div className="row" key={atId || title || i}>
                                <div className="col-xs-9 col-md-3 col-lg-2 title">
                                    <h6 className="text-500 accession">
                                        { atId ? <a href={atId}>{ title }</a> : title }
                                    </h6>
                                </div>

                                <div className="col-xs-3 col-md-2 text-right download-button pull-right">
                                    <Button bsSize="small" href={ downloadHref } download disabled={!downloadHref}>
                                        <i className={"icon icon-" + (iconClass || 'download')}/>
                                    </Button>
                                </div>

                                <div className="col-xs-12 col-md-4 col-lg-5 description">
                                    { file.description }
                                </div>

                                <div className="col-xs-12 col-md-3 col-lg-3 submitter">
                                    { FilesInSetTable.submitterLink(file && file.submitted_by) }
                                </div>
                                
                                <div className="col-xs-12 col-md-12 divider-column">
                                    <div className="divider"/>
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        );
    }

});