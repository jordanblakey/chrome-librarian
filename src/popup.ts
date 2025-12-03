console.log('popup script loaded.');

const tree = chrome.bookmarks.getTree();
console.log(tree);

export function farewell(name: string): string {
  return `Goodbye, ${name}!`;
}