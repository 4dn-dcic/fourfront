'use strict';

var React = require('react');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var { highlightTerm, unhighlightTerms } = require('./../../facetlist');
var { console, isServerSide, Filters } = require('./../../util');

var Legend = module.exports = React.createClass({

    statics : {
        Field : React.createClass({

            render : function(){
                return (
                    <div className="field" data-field={this.props.field} onMouseLeave={unhighlightTerms.bind(this, this.props.field)}>
                        <h5 className="text-500 legend-field-title">{ this.props.name || this.props.field }</h5>
                        { this.props.terms.map((term) =>
                            <Legend.Term {...term} field={this.props.field} key={term.term} />
                        )}
                    </div>
                );
            }
        }),

        Term : React.createClass({

            render : function(){
                return (
                    <div
                        className="term"
                        onMouseEnter={highlightTerm.bind(this, this.props.field, this.props.term, this.props.color)}
                    >
                        <div
                            className="color-patch no-highlight-color"
                            data-term={this.props.term}
                            style={{ backgroundColor : this.props.color }}
                        />
                        { this.props.name || this.props.term }
                    </div>
                );
            }
        }),

        parseFieldNames : function(fields, schemas){
            return fields.map(function(field){
                return _.extend({} , field, {
                    'name' : Filters.Field.toName(field.field, schemas || null)
                });
            });
        }

    },
    /*
    shouldComponentUpdate : function(){

    },
    */
    getDefaultProps : function(){
        return {
            'position' : 'absolute',
            'fields' : [],
            'id' : null,
            'className' : 'chart-color-legend',
            'width' : null,
            'title' : null //<h4 className="text-500">Legend</h4>
        };
    },

    render : function(){
        return (
            <div className={"legend " + this.props.className} id={this.props.id} style={{
                opacity : !Array.isArray(this.props.fields) ? 0 : 1,
                width : this.props.width || null
            }}>
                { this.props.title }
                { Array.isArray(this.props.fields) ?
                    Legend.parseFieldNames(this.props.fields, this.props.schemas || null)
                    .map(function(field){
                        return <Legend.Field {...field} key={field.field} />;
                    }) 
                : null }
            </div>
        );

    }



});