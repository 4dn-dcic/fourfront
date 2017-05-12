'use strict';

var React = require('react');
import PropTypes from 'prop-types';
import { ItemDetailList } from './../../item-pages/components';
import { getTitleStringFromContext } from './../../item-pages/item';


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
        
        if (node.meta && node.meta.run_data && node.meta.run_data.file && node.meta.run_data.file['@id']){
            // File
            var file = node.meta.run_data.file;
            var fileTitle = getTitleStringFromContext(file);
            var className = null;
            if (fileTitle === file.accession){
                //className = 'mono-text';
            }
            return (
                <div>
                    <div className="information">
                        File {
                            node.type === 'output' ? 'Generated' :
                                node.type === 'input' ? 'Used' :
                                    null
                        }
                        <h3 className="text-400">
                            <a href={file['@id']} className={className}>{ fileTitle }</a>
                        </h3>
                    </div>
                    <hr/>
                    <ItemDetailList
                        context={node.meta.run_data.file}
                        schemas={this.props.schemas}
                        minHeight={this.props.minHeight}
                    />
                </div>
            )
        }
        if (node.meta && node.meta.run_data && (typeof node.meta.run_data.value === 'number' || typeof node.meta.run_data.value === 'string')){
            return (
                <div style={typeof this.props.minHeight === 'number' ? { minHeight : this.props.minHeight } : null}>
                    <div className="information">
                        Value Used
                        <h3 className="text-400">
                            <pre>{ node.meta.run_data.value }</pre>
                        </h3>
                    </div>
                </div>
            )
        }
        if (node.type === 'step' && node.meta && node.meta.uuid){
            return (
                <ItemDetailList context={node.meta} schemas={this.props.schemas} minHeight={this.props.minHeight} />
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
                <h5 className="text-500">
                    { type }
                </h5>
                <h4 className="text-300">
                    <span>{ node.name }</span>
                </h4>
                <div className="detail-pane-body">
                    { this.body() }
                </div>
            </div>
        );
    }

}