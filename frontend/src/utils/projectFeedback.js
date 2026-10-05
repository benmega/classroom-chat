import { AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';

// How a project's teacher_comment is presented, by review status. Only an approved project gets
// the positive treatment: a rejected one is asking for changes, and a resubmitted (pending) one
// still carries its old revision note.
const FEEDBACK_STYLES = {
    approved: { Icon: CheckCircle, className: '', reviewTitle: 'Instructor Review', noteLabel: 'Teacher Note' },
    rejected: { Icon: AlertCircle, className: 'revision-feedback', reviewTitle: 'Revision Requested', noteLabel: 'Revision Note' },
    pending: { Icon: MessageSquare, className: 'pending-feedback', reviewTitle: 'Previous Feedback', noteLabel: 'Previous Note' },
};

export const getFeedbackStyle = (status) => FEEDBACK_STYLES[status] || FEEDBACK_STYLES.pending;
