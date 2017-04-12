var React = require('react');
var url = require('url');
var productionHost = require('./globals').productionHost;

var TestWarning = module.exports = React.createClass({

    contextTypes: {
        location_href: React.PropTypes.string,
        portal: React.PropTypes.object
    },

    hideTestWarning: function(e) {

        // Remove the warning banner because the user clicked the close icon
        this.setState({testWarning: false});

        // If collection with .sticky-header on page, jiggle scroll position
        // to force the sticky header to jump to the top of the page.
        var hdrs = document.getElementsByClassName('sticky-header');
        if (hdrs.length) {
            window.scrollBy(0,-1);
            window.scrollBy(0,1);
        }
    },

    render : function(){
        if (!this.props.visible) return null;
        return (
            <div className="test-warning">
                <div className="container">
                    <div>
                        <span style={{ fontSize : '13.5px' }}>
                            <i className="icon icon-fw icon-info circle-icon hidden-xs" style={{
                                marginRight : 10,
                                marginTop : -2
                            }}/>
                            The data displayed on this page is not official and only for testing purposes.
                        </span>
                        <a 
                            className="test-warning-close icon icon-times"
                            title="Hide"
                            onClick={function(e){
                                e.preventDefault();
                                e.stopPropagation();
                                if (this.props.setHidden){
                                    this.props.setHidden(e);
                                    return;
                                }
                                this.hideTestWarning();
                            }.bind(this)}
                        />
                    </div>
                </div>
            </div>
        );

    }

});