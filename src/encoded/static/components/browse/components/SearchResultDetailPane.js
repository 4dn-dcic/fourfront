'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import { Detail, FlexibleDescriptionBox } from './../../item-pages/components';


export class SearchResultDetailPane extends React.Component {

    static propTypes = {
        'result' : PropTypes.shape({
            '@id' : PropTypes.string,
            'display_title' : PropTypes.string,
            'description' : PropTypes.string
        }),
        'popLink' : PropTypes.bool
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    componentDidUpdate(pastProps, pastState){
        if (this.props.open && !pastProps.open) ReactTooltip.rebuild();
    }

    descriptionBox(description = this.props.result.description){
        if (!description) return null;
        return (
            <div className="flex-description-container">
                <h5><i className="icon icon-fw icon-align-left"/>&nbsp; Description</h5>
                <FlexibleDescriptionBox
                    description={ description }
                    fitTo="self"
                    textClassName="text-medium"
                    dimensions={null}
                />
                <hr className="desc-separator" />
            </div>
        );
    }

    render (){
        var { result, popLink } = this.props;
        return (
            <div>
                { this.descriptionBox(result.description) }
                <div className="item-page-detail">
                    <h5 className="text-500"><i className="icon icon-fw icon-list"/>&nbsp; Details</h5>
                    <Detail context={result} open={false} popLink={popLink}/>
                </div>
            </div>
        );
    }
}