'use strict';

var React = require('react');
var { Button } = require('react-bootstrap');
var url = require('url');

var FilesInSetTable = module.exports = React.createClass({

    propTypes : {
        'files' : React.PropTypes.arrayOf(React.PropTypes.shape({
            //'link_id'         : React.PropTypes.string.isRequired,
            'accession'       : React.PropTypes.string,
            'display_title'   : React.PropTypes.string,
            'attachment'      : React.PropTypes.shape({ 'download' : React.PropTypes.string }).isRequired,
            'description'     : React.PropTypes.string.isRequired

        })).isRequired
    },

    render : function(){
        return (
            <div className="files-in-set-table">
                { 
                    this.props.files.map(function(file, i){
                        var downloadLinkExists = true;
                        var atId = (file && file.link_id && file.link_id.replace(/~/g, "/")) || null;
                        var title = file.display_title || file.accession;
                        var downloadHref = (file && file.attachment && file.attachment.href) || null; // IDK correct download url.
                        if (typeof downloadHref === 'string' && downloadHref.charAt(0) !== '/'){
                            // Assume relative link, relative to Item not this set however.
                            if (atId){
                                var fileItemURLPath = url.parse(atId).pathname;
                                downloadHref = fileItemURLPath + (fileItemURLPath.slice(-1) === '/' ? '' : '/') + downloadHref;
                            } else {
                                downloadLinkExists = false;
                            }
                        } else if (!downloadHref) downloadLinkExists = false;
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
                                    <Button bsSize="small" href={ downloadLinkExists && downloadHref } download>
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

});