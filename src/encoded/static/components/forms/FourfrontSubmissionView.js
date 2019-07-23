import React from 'react';

import SubmissionView from '@hms-dbmi-bgm/shared-portal-components/src/components/forms/SubmissionView';

export default class FourfrontSubmissionView extends React.PureComponent {
    render(){
        return <SubmissionView {...this.props} />;
    }
}
