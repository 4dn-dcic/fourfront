'use strict';

var React = require('react');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var { console, isServerSide, Filters } = require('./../../util');

var Legend = module.exports = React.createClass({

    statics : {
        Field : React.createClass({

            render : function(){
                return (
                    <div className="field" data-field={this.props.field}>
                        <h6>{ this.props.name || this.props.field }</h6>
                        { this.props.terms.map(function(term){ return <Legend.Term {...term} key={term.term} />; }) }
                    </div>
                );
            }
        }),

        Term : React.createClass({

            render : function(){
                return (
                    <div className="term">
                        { this.props.name || this.props.term }
                    </div>
                );
            }
        })
    },

    getDefaultProps : function(){
        return {
            'position' : 'absolute',
            'fields' : [],
            'id' : null,
            'className' : 'chart-color-legend'
        };
    },

    render : function(){

        return (
            <div className={"legend " + this.props.className} id={this.props.id}>
                <h5>Legend</h5>
                { this.props.fields.map(function(field){ return <Legend.Field {...field} key={field.field} />; }) }
            </div>
        );

    }



});