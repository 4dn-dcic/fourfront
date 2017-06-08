'use strict';

import React from 'react';
import createReactClass from 'create-react-class';
import { object, console } from './../util';


var Toggle = module.exports = createReactClass({

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