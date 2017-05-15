'use strict';

var React = require('react');
import PropTypes from 'prop-types';
import ItemDetailList from './ItemDetailList';
import FlexibleDescriptionBox from './FlexibleDescriptionBox';
import { getTitleStringFromContext } from './../item';
import { console, object, layout } from './../../util';


class FileDetailBody extends React.Component {

    static downloadButton(href, disabled, filename, title = 'Download', className = ''){
        return (
            <a href={ href } className={className + " btn btn-default btn-info download-button " + (disabled ? ' disabled' : '')} download data-tip={filename}>
                <i className="icon icon-fw icon-cloud-download"/>{ title ? <span>&nbsp; { title }</span> : null }
            </a>
        );
    }

    static propTypes = {
        'node' : PropTypes.object.isRequired,
        'file' : PropTypes.object.isRequired,
        'schemas' : PropTypes.object.isRequired,
        'minHeight' : PropTypes.number,
        'keyTitleDescriptionMap' : PropTypes.object
    }

    static defaultProps = {
        'canDownloadStatuses' : [
            'uploaded',
            'released',
            'replaced',
            'in review by project',
            'released to project'
        ]
    }

    canDownload(){
        if (this.props.canDownloadStatuses.indexOf(this.props.file.status) > -1){
            return true;
        }
        return false;
    }

    fileTitleBox(){
        var node = this.props.node;
        var file = this.props.file;
        var fileTitle = getTitleStringFromContext(file);
        return(
            <div className="col-sm-4 col-lg-4 file-title box">
                <span className="text-600">
                    {
                    node.type === 'output' ? 'Generated' :
                        node.type === 'input' ? 'Used' :
                            null
                    } File
                </span>
                <div className="hidden-lg download-button-container">
                    { FileDetailBody.downloadButton(file.href, !this.canDownload(), file.filename, null, 'btn-xs') }
                </div>
                <h3 className="text-500 text-ellipsis-container node-file-title" title={fileTitle}>
                    <a href={object.atIdFromObject(file) || '/' + file.uuid}>{ fileTitle }</a>
                </h3>
            </div>
        );
    }

    downloadLinkBox(){
        var gridSize = layout.responsiveGridState();
        if (gridSize === 'sm' || gridSize === 'xs') return null;
        var file = this.props.file;
        if (!file.filename && !file.href) return <div className="col-sm-4 col-lg-2 box">&nbsp;</div>;

        var title = file.href ? <span>Download</span> : 'File Name';
        var disabled = !this.canDownload();
        var content = file.filename || file.href;
        var content = file.href ?
            FileDetailBody.downloadButton(file.href, disabled, file.filename)
            :
            <span>{ file.filename || file.href }</span>;

        return (
            <div className="col-sm-4 col-lg-2 text-right hidden-sm hidden-xs hidden-md box">
                <h5 className="text-400 text-ellipsis-container">
                    { content }
                </h5>
            </div>
        );
    }

    descriptionBox(){
        var file = this.props.file;
        var gridSize = layout.responsiveGridState();
        return (
            <div className="col-sm-8 col-lg-6 box">
                <span className="text-600">{ file.description ? 'Description' : (file.notes ? 'Notes' : 'Description') }</span>
                <div className="description-box-container">
                    <FlexibleDescriptionBox
                        description={file.description || file.notes || <em>No description.</em>}
                        fitTo="self"
                        textClassName="text-large"
                        expanded={gridSize === 'xs' || gridSize === 'sm' || gridSize === 'md'}
                        dimensions={null}
                    />
                </div>
            </div>
        );
    }

    render(){

        var node = this.props.node;
        var file = this.props.file;

        return (
            <div>
                <div className="information">
                    <div className="row">


                        { this.fileTitleBox() }
                        { this.descriptionBox() }
                        { this.downloadLinkBox() }


                    </div>

                    
                </div>
                <hr/>
                <ItemDetailList
                    context={node.meta.run_data.file}
                    schemas={this.props.schemas}
                    minHeight={this.props.minHeight}
                    keyTitleDescriptionMap={this.props.keyTitleDescriptionMap}
                />
            </div>
        );
    }
}


export default class WorkflowDetailPane extends React.Component {

    static propTypes = {
        'selectedNode' : PropTypes.oneOfType([ PropTypes.object, PropTypes.oneOf([null]) ])
    }

    static defaultProps = {
        'minHeight' : 500,
        'selectedNode' : null,
        'keyTitleDescriptionMap' : {
            '@id' : {
                'title' : 'Link'
            }
        }
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.body = this.body.bind(this);
    }

    body(){
        var node = this.props.selectedNode;

        console.log('NODE', node);
        
        if (node.meta && node.meta.run_data && node.meta.run_data.file && node.meta.run_data.file['@id']){
            // File
            var file = node.meta.run_data.file;
            var fileTitle = getTitleStringFromContext(file);
            var className = null;
            if (fileTitle === file.accession){
                //className = 'mono-text';
            }
            return (
                <layout.WindowResizeUpdateTrigger>
                    <FileDetailBody
                        file={node.meta.run_data.file}
                        node={node}
                        schemas={this.props.schemas}
                        minHeight={this.props.minHeight}
                        keyTitleDescriptionMap={this.props.keyTitleDescriptionMap}
                    />
                </layout.WindowResizeUpdateTrigger>
            );
        }
        if (node.meta && node.meta.run_data && (typeof node.meta.run_data.value === 'number' || typeof node.meta.run_data.value === 'string')){
            return (
                <div style={typeof this.props.minHeight === 'number' ? { minHeight : this.props.minHeight } : null}>
                    <div className="information">
                        <br/>
                        Value Used
                        <h3 className="text-500">
                            <pre>{ node.meta.run_data.value }</pre>
                        </h3>
                    </div>
                </div>
            )
        }
        if (node.type === 'step' && node.meta && node.meta.uuid){
            return (
                <div>
                    <div className="information">

                        <div className="row">


                            <div className="col-md-6 col-lg-4 box">
                                <span>Step Name</span>
                                <h3 className="text-500">
                                    <a href={object.atIdFromObject(node.meta) || '/' + node.meta.uuid} className={className}>
                                        { node.meta.name || node.meta.title || node.meta.display_title || node.meta.uuid }
                                    </a>
                                </h3>
                            </div>

                            <div className="col-md-6 col-lg-4 box">
                                <span>Step Name</span>
                                <h3 className="text-400">
                                    <a href={object.atIdFromObject(node.meta) || '/' + node.meta.uuid} className={className}>
                                        { node.meta.name || node.meta.title || node.meta.display_title || node.meta.uuid }
                                    </a>
                                </h3>
                            </div>


                        </div>

                        
                    </div>
                    <hr/>
                    <ItemDetailList context={node.meta} schemas={this.props.schemas} minHeight={this.props.minHeight} />

                </div>
            )
        }
    }

    render(){
        var node = this.props.selectedNode;
        if (!node) return null;

        var type;
        if (node.type === 'step'){
            type = 'Analysis Step';
        } else {
            type = node.format || node.type;
        }

        return (
            <div className="detail-pane">
                <h5 className="text-700 node-type">
                    { type } <i className="icon icon-fw icon-angle-right"/> <span className="text-400">{ node.name }</span>
                </h5>
                <div className="detail-pane-body">
                    { this.body() }
                </div>
            </div>
        );
    }

}