'use strict';

var React = require('react');
var { object, console } = require('./../util');

var Toggle = module.exports = React.createClass({

    getDefaultProps : function(){
        return {
            'name' : 'onoffswitch',
            'onChange' : function(e){
                console.log("Toggled ", this);
            },
            'id' : null,
            'checked' : false,
            'className' : ''
        };
    },

    render : function(){
        var id = this.props.id || object.randomId();
        return (
            <div className={"onoffswitch " + this.props.className}>
                <input
                    type="checkbox"
                    onChange={this.props.onChange}
                    name={this.props.name}
                    id={id}
                    className="onoffswitch-checkbox"
                    checked={this.props.checked}
                />
                <label className="onoffswitch-label" htmlFor={id}>
                    <span className="onoffswitch-inner"></span>
                    <span className="onoffswitch-switch"></span>
                </label>
            </div>
        );
    }

});