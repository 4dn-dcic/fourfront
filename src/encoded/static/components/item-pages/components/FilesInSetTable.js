'use strict';

var React = require('react');

var FilesInSetTable = module.exports = React.createClass({

    propTypes : {
        'files' : React.PropTypes.arrayOf(React.PropTypes.shape({
            'link_id'         : React.PropTypes.string.isRequired,
            'display_title'   : React.PropTypes.string.isRequired,
            'attachment'      : React.PropTypes.shape({ 'download' : React.PropTypes.string })

        })).isRequired
    },

    render : function(){
        return (
            <div className="files-in-set-table">
                { 
                    this.props.files.map(function(file){
                        var atId = file.link_id.replace(/~/g, "/");
                        return (
                            <div className="row" key={atId}>
                                <div className="col-sm-12 col-md-4">
                                    <a href={atId}>{ file.display_title }</a>
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        );
    }

});