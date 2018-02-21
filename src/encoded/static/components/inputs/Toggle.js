'use strict';

import React from 'react';
import { object, console } from './../util';

/**
 * Wraps a checkbox input to turn it into a toggle switch using CSS.
 * Use just like a checkbox input element.
 *
 * @type {Component}
 * @prop {string} id - A unique id. If not supplied, one is autogenerated.
 * @prop {function} onChange - Change event handler.
 * @prop {boolean} checked - Whether is checked or not.
 */
export class Toggle extends React.Component {

    static defaultProps = {
        'name' : 'onoffswitch',
        'onChange' : function(e){
            console.log("Toggled ", this);
        },
        'id' : null,
        'checked' : false,
        'className' : ''
    }

    render(){
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

}