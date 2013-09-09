/** @jsx React.DOM */
define(['exports', 'react', 'uri', 'globals'],
function (biosample, React, URI, globals) {
    'use strict';

    var Panel = function (props) {
        // XXX not all panels have the same markup
        var context;
        if (props['@id']) {
            context = props;
            props = {context: context, key: context['@id']};
        }
        return globals.panel_views.lookup(props.context)(props);
    };


    var Biosample = biosample.Biosample = React.createClass({
        render: function() {
            var context = this.props.context;
            var itemClass = globals.itemClass(context, 'view-item');
            return (
                <div class={itemClass}>
                    <header class="row">
                        <div class="span12">
                            <ul class="breadcrumb">
                                <li>Biosamples <span class="divider">/</span></li>
                                <li>{context.biosample_type}{' '}<span class="divider">/</span></li>{' '}
                                <li class="active">{context.organism.name}</li>
                            </ul>
                            <h2>{context.accession}{' / '}<span class="cap-me-once">{context.biosample_type}</span></h2>
                        </div>
                    </header>
                    <div class="panel data-display">
                        <dl class="key-value">
                            <dt>Term name</dt>
                            <dd>{context.biosample_term_name}</dd>

                            <dt>Term ID</dt>
                            <dd>{context.biosample_term_id}</dd>

                            <dt hidden={!context.description}>Description</dt>
                            <dd hidden={!context.description}>{context.description}</dd>

                            <dt>Source</dt>
                            <dd><a href={context.source.url}>{context.source.title}</a></dd>

                            <dt hidden={!context.product_id}>Product ID</dt>
                            <dd hidden={!context.product_id}><maybe_link href={context.url}>{context.product_id}</maybe_link></dd>

                            <dt hidden={!context.lot_id}>Lot ID</dt>
                            <dd hidden={!context.lot_id}>{context.lot_id}</dd>

                            <dt>RFA</dt>
                            <dd>{context.award.rfa}</dd>

                            <dt>Submitted by</dt>
                            <dd>{context.submitted_by.title}</dd>

                            <dt>Lab</dt>
                            <dd>{context.lab.title}</dd>

                            <dt>Grant</dt>
                            <dd>{context.award.name}</dd>

                            <dt hidden={!context.note}>Note</dt>
                            <dd hidden={!context.note}>{context.note}</dd>
                        </dl>

                        {context.donor ?
                            <section>
                                <hr />
                                <h4>Donor Information</h4>
                                <Panel context={context.donor} />
                            </section>
                        : null}

                        {context.treatments.length ?
                            <section>
                                <hr />
                                <h4>Treatment Details</h4>
                                {context.treatments.map(Panel)}
                            </section>
                        : null}

                        {context.constructs.length ?
                            <section>
                                <hr />
                                <h4>Construct Details</h4>
                                {context.constructs.map(Panel)}
                            </section>
                        : null}

                    </div>

                    {context.protocol_documents.length ?
                        <div>
                            <h3>Protocol documents</h3>
                            {context.protocol_documents.map(Panel)}
                        </div>
                    : null}

                    {context.characterizations.length ?
                        <div>
                            <h3>Characterizations</h3>
                            {context.characterizations.map(Panel)}
                        </div>
                    : null}

                    <h3 hidden={!context.related_biosample_uuid}>Related Biosamples</h3>
                    {context.derived_from.length ?
                        <div class="panel data-display">
                            <h4>Derived From Biosample</h4>
                            <ul>{context.derived_from.map(function (biosample) {
                                return (
                                    <li key={biosample['@id']}>
                                        <a href={biosample['@id']}>{biosample.accession}</a>
                                    </li>
                                );
                            })}
                           </ul>
                        </div>
                    : null}
                </div>
            );
        }
    });

    globals.content_views.register(Biosample, 'biosample');


    var maybe_link = function (props, children) {
        if (props.href == 'N/A') {
            return children;
        } else {
            return (
                <a href={props.href}>{children}</a>
            );
        }
    };

    var HumanDonor = biosample.HumanDonor = React.createClass({
        render: function() {
            var context = this.props.context;
            return (
                <dl class="key-value">
                    <dt>Accession</dt>
                    <dd>{context.accession}</dd>

                    <dt>Life stage</dt>
                    <dd>{context.life_stage}</dd>

                    <dt>Age</dt>
                    <dd>{context.age}{' '}{context.age_units}</dd>

                    <dt>Sex</dt>
                    <dd>{context.sex}</dd>

                    <dt>Health status</dt>
                    <dd>{context.health_status}</dd>

                    <dt>Ethnicity</dt>
                    <dd>{context.ethnicity}</dd>
                </dl>
            );
        }
    });

    globals.panel_views.register(HumanDonor, 'human_donor');


    var MouseDonor = biosample.MouseDonor = React.createClass({
        render: function() {
            var context = this.props.context;
            return (
                <dl class="key-value">
                    <dt>Accession</dt>
                    <dd>{context.accession}</dd>

                    <dt>Life stage</dt>
                    <dd>{context.life_stage}</dd>

                    <dt>Age</dt>
                    <dd>{context.age}{' '}{context.age_units}</dd>

                    <dt>Sex</dt>
                    <dd>{context.sex}</dd>

                    <dt>Health status</dt>
                    <dd>{context.health_status}</dd>

                    <dt>Strain background</dt>
                    <dd>{context.strain_background}</dd>

                    <dt>Strain name</dt>
                    <dd>{context.strain_name}</dd>
                </dl>
            );
        }
    });

    globals.panel_views.register(MouseDonor, 'mouse_donor');


    var Treatment = biosample.Treatment = React.createClass({
        render: function() {
            var context = this.props.context;
            var title = '';
            if (context.concentration) {
                title += context.concentration + ' ' + context.concentration_units + ' ';
            }
            title += context.treatment_term_name + ' (' + context.treatment_term_id + ') ';
            if (context.duration) {
                title += 'for ' + context.duration + ' ' + context.duration_units;
            }
            return (
                <dl class="key-value">
                    <dt>Treatment</dt>
                    <dd>{title}</dd>

                    <dt>Type</dt>
                    <dd>{context.treatment_type}</dd>

                </dl>
            );
        }
    });

    globals.panel_views.register(Treatment, 'treatment');


    var Construct = biosample.Construct = React.createClass({
        render: function() {
            var context = this.props.context;
            return (
                <dl class="key-value">
                    <dt>Vector</dt>
                    <dd>{context.vector_backbone_name}</dd>

                    <dt>Construct Type</dt>
                    <dd>{context.construct_type}</dd>

                    <dt>Description</dt>
                    <dd>{context.description}</dd>

                    <dt>Source</dt>
                    <dd>{context.source.title}</dd>

                    <dt>Product ID</dt>
                    <dd><maybe_link href={context.url}>{context.product_id}</maybe_link></dd>

                </dl>
            );
        }
    });

    globals.panel_views.register(Construct, 'construct');


    var Document = biosample.Document = React.createClass({
        render: function() {
            var context = this.props.context;
            var attachmentHref, attachmentUri;
            var figure, download, src, imgClass, alt;
            var imgClass = "characterization-img characterization-file";
            var height = "100";
            var width = "100";
            if (context.attachment) {
                attachmentUri = URI(context.attachment.href, URI(context['@id']).href);
                attachmentHref = attachmentUri.pathname + attachmentUri.search;
                if (context.attachment.type.split('/', 1)[0] == 'image') {
                    imgClass = 'characterization-img';
                    src = attachmentHref;
                    height = context.attachment.height;
                    width = context.attachment.width;
                    alt = "Characterization Image"
                } else if (context.attachment.type == "application/pdf"){
                    src = "/static/img/file-pdf.svg";
                    alt = "Characterization PDF Icon";
                } else {
                    src = "/static/img/file.svg";
                    alt = "Characterization Icon";
                }
                figure = (
                    <a data-bypass="true" href={attachmentHref}>
                        <img class={imgClass} src={src} height={height} width={width} alt={alt} />
                    </a>
                );
                download = (
                    <a data-bypass="true" href={attachmentHref} download={context.attachment.download}>
                        {context.attachment.download}
                    </a>
                );
            } else {
                src = "/static/img/file-broken.png";
                alt = "Characterization File Broken Icon";
                figure = (
                    <img class={imgClass} src={src} height={height} width={width} alt={alt} />
                );
                download = (
                    <em>Document not available</em>
                );
            }

            return (
                <section class="type-document view-detail panel status-none">
                    <div class="container">
                        <div class="row">
                            <div class="span6">
                                <figure>
                                    {figure}
                                </figure>
                            </div>
                            <div class="span5">
                                <h3 style={{'text-transform': 'capitalize'}}>{context.document_type}</h3>
                                <p>{context.description}</p>
                                <dl class="key-value">
                                    <dt>Submitted By</dt>
                                    <dd>{context.submitted_by.title}</dd>

                                    <dt>Lab</dt>
                                    <dd>{context.lab.title}</dd>

                                    <dt>Grant</dt>
                                    <dd>{context.award.name}</dd>

                                    <dt><i class="icon-download-alt"></i> Download</dt>
                                    <dd>{download}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </section>
            );
        }
    });

    globals.panel_views.register(Document, 'document');
    globals.panel_views.register(Document, 'biosample_characterization');


    return biosample;
});
