'use strict';

var React = require('react');
var globals = require('./../../globals');
var { Filters } = require('./../../util');
var _ = require('underscore');

var ItemPageTitle = module.exports = React.createClass({

    statics : {
        
        /**
         * Get Item title string from a context object (JSON representation of Item).
         * 
         * @memberof module:item-pages/components.ItemPageTitle
         * @static
         * @public
         * @param {Object} context - JSON representation of an Item object.
         * @returns {string} The title.
         */
        getTitleStringFromContext : function(context){
            return context.display_title || globals.listing_titles.lookup(context)({'context' : context});
        },

        /**
         * Determine whether the title which is displayed is an accession or not.
         * Use for determining whether to include accession in ItemHeader.TopRow.
         * 
         * @memberof module:item-pages/components.ItemPageTitle
         * @static
         * @public
         * @param {Object} context - JSON representation of an Item object.
         * @returns {string} The title.
         */
        isDisplayTitleAccession : function(context){
            if (context.accession && context.accession === ItemPageTitle.getTitleStringFromContext(context)) return true;
            return false;
        },

        getBaseItemType : function(context){
            var types = context['@type'];
            if (!Array.isArray(types) || types.length === 0) return "Unknown";
            var i = 0;
            console.log(types);
            while (i < types.length){
                if (types[i + 1] === 'Item'){
                    return types[i]; // Last type before 'Item'.
                }
                i++;
            }
            return types[i-1]; // Fallback.
        },

        getBaseItemTypeTitle : function(context, schemas = null){
            var baseType = ItemPageTitle.getBaseItemType(context);

            // Grab schemas from Filters if we don't have them but they've been cached into there from App.
            schemas = schemas || (Filters.getSchemas && Filters.getSchemas());

            if (schemas && schemas[baseType] && schemas[baseType].title){
                return schemas[baseType].title;
            }

            // Correct baseType to title if not in schemas.
            switch (baseType){
                case 'ExperimentSet':
                    return 'Experiment Set';
                default:
                    return baseType;
            }
        }

    },

    /**
     * The render function.
     * 
     * @instance
     * @returns {Element} An <h1> element with .page-title class.
     */
    render : function(){
        return (
            <h1 className="page-title">
                { ItemPageTitle.getBaseItemTypeTitle(this.props.context, this.props.schemas) } <span className="subtitle prominent">
                    { ItemPageTitle.getTitleStringFromContext(this.props.context) }
                </span>
            </h1>
        );
    }

});