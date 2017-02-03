'use strict';

var React = require('react');

module.exports = React.createClass({
    getDefaultProps : function(){ return { 'display' : true }; },
    render : function(){
        return (
            <div className={"fetching-view" + (!this.props.display ? ' invisible' : '' )}>
                <div className="inner">
                    <i className="icon icon-spin icon-circle-o-notch"/>
                </div>
            </div>
        );
    }
});