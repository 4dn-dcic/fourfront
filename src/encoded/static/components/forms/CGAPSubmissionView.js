import React from 'react';

import SubmissionView from '@hms-dbmi-bgm/shared-portal-components/src/components/forms/SubmissionView';
import { itemTypeHierarchy } from './../util/itemTypeHierarchy';

export default class CGAPSubmissionView extends React.PureComponent {
    render(){
        return <SubmissionView {...this.props} itemTypeHierarchy={itemTypeHierarchy} />;
    }
}
