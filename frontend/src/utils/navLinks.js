import { User, Shield, Award, FileCheck, Zap, RefreshCw, Disc, MessageSquare } from 'lucide-react';

// Single source of truth for the signed-in user's navigation links. Used by the header
// dropdown and mobile sidebar (Layout.jsx) and the chat sidebar footer (ChatSidebarFooter.jsx).
// `to` = in-app route, `href` = external link, `testId` only applied where the caller passes it.
export const USER_NAV_LINKS = [
    { to: '/profile', label: 'Profile', icon: User, testId: 'nav-profile' },
    { to: '/admin', label: 'Admin Panel', icon: Shield, adminOnly: true },
    { to: '/achievements', label: 'Achievements', icon: Award },
    { to: '/submit-certificate', label: 'Certificate', icon: FileCheck },
    { to: '/submit-challenge', label: 'Challenge', icon: Zap },
    { to: '/bit-shift', label: 'Bit Shift', icon: RefreshCw },
    { href: 'https://benmega.github.io/screen-recorder/', label: 'Record', icon: Disc },
    { to: '/history', label: 'History', icon: MessageSquare },
];

export const getUserNavLinks = (isAdmin) => USER_NAV_LINKS.filter(link => !link.adminOnly || isAdmin);
