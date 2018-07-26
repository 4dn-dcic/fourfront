'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, layout, navigate, ajax } from'./../util';
import * as globals from './../globals';
import StaticPage from './StaticPage';


export default class StatisticsPageView extends StaticPage {

    componentDidMount(){
        super.componentDidMount();
    }

    render(){
        return (
            <StaticPage.Wrapper>
                TODO
            </StaticPage.Wrapper>
        );
    }

}


globals.content_views.register(StatisticsPageView, 'StatisticsPage');
