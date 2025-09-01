import type { State } from '../types/jira';

export const JIRA_PROPERTY_KEY = 'com.yrambler2001.jira-tracker';

export const parseState = (state: string): State => {
  let parsed: State | null = null;
  try {
    if (state) {
      parsed = JSON.parse(state);
    }
  } catch (e) {
    console.error('Could not parse state from Jira user property', e);
  }
  if (!parsed || typeof parsed !== 'object') parsed = { trackedTickets: {}, starredTickets: [] };
  if (!parsed.trackedTickets) parsed.trackedTickets = {};
  if (!parsed.starredTickets) parsed.starredTickets = [];
  return parsed as State;
};

export const stringifyState = (state: State): string => {
  const stateToStore = {
    trackedTickets: state.trackedTickets,
    starredTickets: state.starredTickets,
  };
  return JSON.stringify(stateToStore);
};

export const extractTextFromAtlassianDocumentFormat = (node: any): string => {
  if (!node) return '';

  switch (node.type) {
    case 'text':
      return node.text || '';
    case 'inlineCard':
      return node.attrs.url || '';
    case 'paragraph':
    case 'doc':
    case 'blockquote':
    case 'heading':
      return (node.content || []).map(extractTextFromAtlassianDocumentFormat).join('');
    case 'bulletList':
    case 'orderedList':
      return (node.content || []).map(extractTextFromAtlassianDocumentFormat).join('\n');
    case 'listItem':
      return `- ${(node.content || []).map(extractTextFromAtlassianDocumentFormat).join('')}\n`;
    default:
      return (node.content || []).map(extractTextFromAtlassianDocumentFormat).join('');
  }
};
