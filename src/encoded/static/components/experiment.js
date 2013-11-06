/** @jsx React.DOM */
define(['exports', 'react', 'underscore', './globals', './dbxref'],
function (exports, React, _, globals, dbxref) {
    'use strict';

    var DbxrefList = dbxref.DbxrefList;

    var Panel = function (props) {
        // XXX not all panels have the same markup
        var context;
        if (props['@id']) {
            context = props;
            props = {context: context};
        }
        return globals.panel_views.lookup(props.context)(props);
    };



    var Experiment = exports.Experiment = React.createClass({
        render: function() {
            var context = this.props.context;
            var itemClass = globals.itemClass(context, 'view-item');
            var replicates = _.sortBy(context.replicates, function(item) {
                return item.biological_replicate_number;
            });
            var documents = {};
            replicates.forEach(function (replicate) {
                if (!replicate.library) return;
                replicate.library.documents.forEach(function (doc) {
                    documents[doc['@id']] = Panel({context: doc});
                });
            })
            // Adding experiment specific documents
            context.documents.forEach(function (document) {
                documents[document['@id']] = Panel({context: document})
            });
            var antibodies = {};
            replicates.forEach(function (replicate) {
                if (replicate.antibody) {
                    antibodies[replicate.antibody['@id']] = replicate.antibody;
                }
            });
            var antibody_accessions = []
            for (var key in antibodies) {
                antibody_accessions.push(antibodies[key].accession);
            }
            // XXX This makes no sense.
            //var control = context.possible_controls[0];
            return (
                <div className={itemClass}>
                    <header className="row">
                        <div className="span12">
                            <ul className="breadcrumb">
                                <li>Experiment <span className="divider">/</span></li>
                                <li className="active">{context.assay_term_name}</li>
                            </ul>
                            <h2>Experiment summary for {context.accession}</h2>
                        </div>
                    </header>
                    <div className="panel data-display">
                        <dl className="key-value">
                            <dt>Accession</dt>
                            <dd>{context.accession}</dd>

                            <dt hidden={!context.description}>Description</dt>
                            <dd hidden={!context.description}>{context.description}</dd>

                            <dt hidden={!context.biosample_term_name}>Biosample</dt>
                            <dd hidden={!context.biosample_term_name}>{context.biosample_term_name}</dd>

                            <dt hidden={!context.biosample_type}>Biosample type</dt>
                            <dd hidden={!context.biosample_type}>{context.biosample_type}</dd>

                            {context.target ? <dt>Target</dt> : null}
                            {context.target ? <dd><a href={context.target['@id']}>{context.target.label}</a></dd> : null}

                            {antibody_accessions.length ? <dt>Antibody</dt> : null}
                            {antibody_accessions.length ? <dd>{antibody_accessions.join(', ')}</dd> : null}

                            <dt hidden={!context.possible_controls.length}>Controls</dt>
                            <dd hidden={!context.possible_controls.length}>
                                <ul>
                                        {context.possible_controls.map(function (control) {
                                            return (
                                                <li key={control['@id']}>
                                                    <a href={control['@id']}>
                                                        {control.accession}
                                                    </a>
                                                </li>
                                            );
                                        })}
                                    </ul>
                            </dd>

                            <dt hidden={!context.encode2_dbxrefs.length}>ENCODE2 ID</dt>
                            <dd hidden={!context.encode2_dbxrefs.length} className="no-cap">
                                <DbxrefList values={context.encode2_dbxrefs} prefix="ENCODE2" />
                            </dd>

                            <dt>Lab</dt>
                            <dd>{context.lab.title}</dd>
                            
                            <dt hidden={!context.aliases.length}>Aliases</dt>
                            <dd className="no-cap" hidden={!context.aliases.length}>{context.aliases.join(", ")}</dd>

                            <dt>Project</dt>
                            <dd>{context.award.rfa}</dd>

                        </dl>
                    </div>

                    <BiosamplesUsed replicates={replicates} />
                    <AssayDetails replicates={replicates} />

                    <div hidden={!Object.keys(documents).length}>
                        <h3>Protocols</h3>
                        {documents}
                    </div>

                    {replicates.map(function (replicate, index) {
                        return (
                            <Replicate replicate={replicate} key={index} />
                        );
                    })}

                    <FilesLinked context={context} />
                </div>
            );
        }
    });

    globals.content_views.register(Experiment, 'experiment');

    var BiosamplesUsed = exports.BiosamplesUsed = function (props) {
        var replicates = props.replicates;
        if (!replicates.length) return (<div hidden={true}></div>);
        var biosamples = {};
        replicates.forEach(function(replicate) {
            var biosample = replicate.library.biosample;
            if (biosample) {
                biosamples[biosample['@id']] = { biosample: biosample, brn: replicate.biological_replicate_number };
            };
        });
        return (
            <div>
                <h3>Biosamples used</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Accession</th>
                            <th>Biosample</th>
                            <th>Type</th>
                            <th>Species</th>
                            <th>Source</th>
                            <th>Submitter</th>
                        </tr>
                    </thead>
                    <tbody>

                    { Object.keys(biosamples).map(function (key, index) {
                        var biosample = biosamples[key].biosample;
                        return (
                            <tr key={index}>
                                <td><a href={biosample['@id']}>{biosample.accession}</a></td>
                                <td>{biosample.biosample_term_name}</td>
                                <td>{biosample.biosample_type}</td>
                                <td>{biosample.donor.organism.name}</td>
                                <td>{biosample.source.title}</td>
                                <td>{biosample.submitted_by.title}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="7"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };


    var AssayDetails = exports.AssayDetails = function (props) {
        var replicates = props.replicates.sort(function(a, b) {
            if (b.biological_replicate_number === a.biological_replicate_number) {
                return a.technical_replicate_number - b.technical_replicate_number;
            }
            return a.biological_replicate_number - b.biological_replicate_number;
        });
        if (!replicates.length) return (<div hidden={true}></div>);
        var replicate = replicates[0];
        var library = replicate.library;
        var platform = replicate.platform;
        var titles = {
            nucleic_acid_term_name: 'Nucleic acid type',
            nucleic_acid_starting_quantity: 'NA starting quantity',
            lysis_method: 'Lysis method',
            extraction_method: 'Extraction method',
            fragmentation_method: 'Fragmentation method',
            size_range: 'Size range',
            library_size_selection_method: 'Size selection method',
        };
        var children = [];
        for (name in titles) {
            if (library[name]) {
                children.push(<dt key={'dt-' + name}>{titles[name]}</dt>);
                children.push(<dd key={'dd-' + name}>{library[name]}</dd>);
            }
        }
        if (typeof(platform) != 'undefined' && platform.title) {
            children.push(<dt key="dt-platform">Platform</dt>);
            children.push(<dd key="dd-platform"><a href={platform['@id']}>{platform.title}</a></dd>);
        }
        return (
            <div>
                <h3>Assay details</h3>
                <dl className="panel key-value">
                    {children}
                </dl>
            </div>
        );
    };


    var Replicate = exports.Replicate = function (props) {
        var replicate = props.replicate;
        var library = replicate.library;
        var biosample = library.biosample;
        return (
            <div key={props.key}>
                <h3>Biological replicate - {replicate.biological_replicate_number}</h3>
                <dl className="panel key-value">
                    <dt>Technical replicate</dt>
                    <dd>{replicate.technical_replicate_number}</dd>

                    <dt>Library</dt>
                    <dd>{library.accession}</dd>

                    {biosample ? <dt>Biosample</dt> : null}
                    {biosample ? <dd>
                        <a href={biosample['@id']}>
                            {biosample.accession}
                        </a>{' '}-{' '}{biosample.biosample_term_name}
                    </dd> : null}
                </dl>
            </div>
        );
    };

    // Can't be a proper panel as the control must be passed in.
    //globals.panel_views.register(Replicate, 'replicate');


    var FilesLinked = exports.FilesLinked = function (props) {
        var context = props.context;
        var files = context.files;
        if (!files.length) return (<div hidden={true}></div>);
        return (
            <div>
                <h3>Files linked to {context.accession}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Accession</th>
                            <th>File type</th>
                            <th>Associated replicates</th>
                            <th>Added by</th>
                            <th>Date added</th>
                            <th>File download</th>
                        </tr>
                    </thead>
                    <tbody>
                    {files.map(function (file, index) {
                        var href = 'http://encodedcc.sdsc.edu/warehouse/' + file.download_path;
                        return (
                            <tr key={index}>
                                <td>{file.accession}</td>
                                <td>{file.file_format}</td>
                                <td>{file.replicate ?
                                    '(' + file.replicate.biological_replicate_number + ', ' + file.replicate.technical_replicate_number + ')'
                                    : null}
                                </td>
                                <td>{file.submitted_by.title}</td>
                                <td>{file.date_created}</td>
                                <td><a href={href} download><i className="icon-download-alt"></i> Download</a></td>
                            </tr>
                        );
                    })}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="6"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };


    return exports;
});
