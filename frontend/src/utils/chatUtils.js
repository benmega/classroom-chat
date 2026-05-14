/**
 * Formats the conversation title for display.
 * If the title follows the auto-generated pattern, it transforms it into a readable date.
 * 
 * @param {string} title - The raw conversation title.
 * @returns {string} - The formatted title.
 */
export const formatConversationTitle = (title) => {
  if (!title) return 'Conversation';
  if (title.startsWith('Conversation started by User') && title.includes(' at ')) {
    const parts = title.split(' at ');
    if (parts.length >= 2) {
      const datePart = parts[1].split('.')[0];
      const date = new Date(datePart.replace(' ', 'T'));
      if (!isNaN(date)) {
        return `Chat on ${date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}`;
      }
    }
  }
  return title;
};
