import React from 'react';

import SubmissionView from '@hms-dbmi-bgm/shared-portal-components/es/components/forms/SubmissionView';

export default class CGAPSubmissionView extends React.PureComponent {
    render(){
        return <SubmissionView {...this.props} />;
    }
}
