/** @jsx React.DOM */
'use strict';
var React = require('react');
var FetchedData = require('./fetched').FetchedData;
var Form = require('./form').Form;
var globals = require('./globals');

    var Fallback = module.exports.Fallback = React.createClass({
        render: function() {
            var url = require('url');
            var context = this.props.context;
            var title = typeof context.title == "string" ? context.title : url.parse(this.props.href).path;
            return (
                <div className="view-item">
                    <header className="row">
                        <div className="col-sm-12">
                            <h2>{title}</h2>
                        </div>
                    </header>
                    {typeof context.description == "string" ? <p className="description">{context.description}</p> : null}
                    <section className="view-detail panel">
                        <div className="container">
                            <pre>{JSON.stringify(context, null, 4)}</pre>
                        </div>
                    </section>
                </div>
            );
        }
    });


    var Item = module.exports.Item = React.createClass({
        render: function() {
            var context = this.props.context;
            var itemClass = globals.itemClass(context, 'view-item');
            var title = globals.listing_titles.lookup(context)({context: context});
            var panel = globals.panel_views.lookup(context)();

            // Make string of alternate accessions
            var altacc = context.alternate_accessions ? context.alternate_accessions.join(', ') : undefined;

            this.transferPropsTo(panel);
            return (
                <div className={itemClass}>
                    <header className="row">
                        <div className="col-sm-12">
                            <h2>{title}</h2>
                            {altacc ? <h4 className="repl-acc">Replaces {altacc}</h4> : null}
                        </div>
                    </header>
                    {context.description ? <p className="description">{context.description}</p> : null}
                    {panel}
                </div>
            );
        }
    });

    globals.content_views.register(Item, 'item');


    // Also use this view as a fallback for anything we haven't registered
    globals.content_views.fallback = function () {
        return Fallback;
    };


    var Panel = module.exports.Panel = React.createClass({
        render: function() {
            var context = this.props.context;
            var itemClass = globals.itemClass(context, 'view-detail panel');
            return (
                <section className={itemClass}>
                    <div className="container">
                        <pre>{JSON.stringify(context, null, 4)}</pre>
                    </div>
                </section>
            );
        }
    });

    globals.panel_views.register(Panel, 'item');


    // Also use this view as a fallback for anything we haven't registered
    globals.panel_views.fallback = function () {
        return Panel;
    };


    var title = module.exports.title = function (props) {
        var context = props.context;
        return context.title || context.name || context.accession || context['@id'];
    };

    globals.listing_titles.register(title, 'item');


    // Also use this view as a fallback for anything we haven't registered
    globals.listing_titles.fallback = function () {
        return title;
    };


    var ItemEdit = module.exports.ItemEdit = React.createClass({
        render: function() {
            var context = this.props.context;
            var itemClass = globals.itemClass(context, 'view-item');
            var title = globals.listing_titles.lookup(context)({context: context});
            var action, form;
            if (context['@type'][0].indexOf('_collection') !== -1) {  // add form
                title = 'Add ' + title;
                action = this.props.context['@id'];
                form = <Form schema={this.props.schema} action={action} defaultValue={this.props.defaultValue} method="POST" />;
            } else {  // edit form
                title = 'Edit ' + title;
                var url = this.props.context['@id'] + '?frame=edit';
                action = this.props.context['@id'];
                form = <FetchedData fetched_prop_name="defaultValue" Component={Form} url={url} schema={this.props.schema} action={action} method="PUT" />;
            }
            return (
                <div className={itemClass}>
                    <header className="row">
                        <div className="col-sm-12">
                            <h2>{title}</h2>
                        </div>
                    </header>
                    {this.transferPropsTo(form)}
                </div>
            );
        }
    });
