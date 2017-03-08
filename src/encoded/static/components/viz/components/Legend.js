'use strict';

var React = require('react');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var { highlightTerm, unhighlightTerms } = require('./../../facetlist');
var { console, isServerSide, Filters, object } = require('./../../util');


var Legend = module.exports = React.createClass({

    statics : {

        /**
         * React component which represents a "Field", which might have multiple terms.
         * 
         * @memberof module:viz/components.Legend
         * @prop {string} field - Field name, in object-dot-notation.
         * @prop {boolean} includeFieldTitle - Whether field title should be included at the top of list of terms.
         * @prop {Object[]} terms - Terms which belong to this field, in the form of objects. 
         * @type React.Component
         */
        Field : React.createClass({

            getDefaultProps : function(){
                return { 'includeFieldTitle' : true };
            },

            /** @ignore */
            render : function(){
                return (
                    <div className="field" data-field={this.props.field} onMouseLeave={unhighlightTerms.bind(this, this.props.field)}>
                        { this.props.includeFieldTitle ? 
                            <h5 className="text-500 legend-field-title">{ this.props.title || this.props.name || this.props.field }</h5>
                        : null }
                        { this.props.terms.map((term) =>
                            <Legend.Term {...term} field={this.props.field} key={term.term} />
                        )}
                    </div>
                );
            }
        }),

        /**
         * React component which represents a Term item.
         * 
         * @memberof module:viz/components.Legend
         * @prop {string} field - Name of field to which this term belongs, in object-dot-notation.
         * @prop {string} term - Name of term.
         * @prop {string|Object} color - Color to show next to term, should be string or RGBColor object.
         * @type React.Component
         */
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
                        { this.props.name || Filters.Term.toName(this.props.field, this.props.term) }
                    </div>
                );
            }
        }),

        experimentsAndFieldsToLegendData : function(experiments, fields, schemas = null){
            return fields.map(function(field){
                return Legend.experimentsAndFieldToLegendDataItem(experiments, field, schemas);
            });
        },

        experimentsAndFieldToLegendDataItem : function(experiments, field, schemas = null){

            var legendFieldItem = {
                'field' : field.field,
                'name' : field.title || field.name || Filters.Field.toName(field.field, schemas),
                'terms' : {}
            };

            experiments.forEach(function(exp){
                var term = object.getNestedProperty(exp, field.field.replace('experiments_in_set.',''), true);
                if (!term) term = "None";
                if (Array.isArray(term)){
                    term = _.uniq(term);
                    if (term.length === 1) term = term[0];
                    else {
                        console.warn('Multiple unique terms for field ' + field.field, term);
                        term = term[0];
                    }
                }
                if (typeof legendFieldItem.terms[term] === 'object') return; // aka continue.
                legendFieldItem.terms[term] = {
                    'color' : vizUtil.colorForNode({
                        'term' : term,
                        'field' : field.field
                    }),
                    'term' : term,
                    'name' : Filters.Term.toName(field.field, term)
                };
            });

            legendFieldItem.terms = _.values(legendFieldItem.terms);
            return legendFieldItem;
            
        },

        parseFieldNames : function(fields, schemas){
            return fields.map(function(field){
                if (!field.title && !field.name) {
                    return _.extend({} , field, {
                        'name' : Filters.Field.toName(field.field, schemas || null)
                    });
                }
                return field;
            });
        }

    },

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
        if (!this.props.fields) return null;
        return (
            <div className={"legend " + this.props.className} id={this.props.id} style={{
                opacity : !Array.isArray(this.props.fields) ? 0 : 1,
                width : this.props.width || null
            }}>
                { this.props.title }
                { Array.isArray(this.props.fields) ?
                    Legend.parseFieldNames(this.props.fields, this.props.schemas || null)
                    .map((field)=>
                        <Legend.Field includeFieldTitle={this.props.includeFieldTitles} {...field} key={field.field} />
                    ) 
                : null }
            </div>
        );

    }



});