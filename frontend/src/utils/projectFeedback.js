import { AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';

// How a project's teacher_comment is presented, by review status. Only an approved project gets
// the positive treatment: a rejected one is asking for changes. A pending project's note is either
// an old revision note (after a resubmit) or one an admin wrote when adding the project, so its
// wording stays neutral and must be true for both.
const FEEDBACK_STYLES = {
    approved: { Icon: CheckCircle, className: '', reviewTitle: 'Instructor Review', noteLabel: 'Teacher Note' },
    rejected: { Icon: AlertCircle, className: 'revision-feedback', reviewTitle: 'Revision Requested', noteLabel: 'Revision Note' },
    pending: { Icon: MessageSquare, className: 'pending-feedback', reviewTitle: 'Teacher Feedback', noteLabel: 'Feedback' },
};

export const getFeedbackStyle = (status) => FEEDBACK_STYLES[status] || FEEDBACK_STYLES.pending;
