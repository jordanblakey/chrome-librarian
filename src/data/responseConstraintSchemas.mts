export const BASIC_JSON_SCHEMA = {
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "description": "The complete, generated text response."
    }
  },
  "required": [
    "text"
  ],
  "additionalProperties": false // Crucial: Prevents any other fields from being generated
};

// This schema enforces the exact structure needed for the Chrome Bookmarks API.
export const GENERATE_BOOKMARKS_JSON_SCHEMA = {
  type: "array",
  description: "An array of new top-level folders, each containing categorized links.",
  items: {
    type: "object",
    properties: {
      folderName: {
        type: "string",
        description: "The name of the new bookmark folder (e.g., 'Programming', 'News', 'Reference')."
      },
      links: {
        type: "array",
        description: "An array containing all bookmark objects categorized into this folder.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            url: { type: "string" },
            addDate: { type: "string" } // Preserve original timestamp as a string
          },
          required: ["title", "url", "addDate"],
          // Prevents the model from adding extra, unexpected keys to the link object
          additionalProperties: false
        }
      }
    },
    required: ["folderName", "links"],
    // Prevents the model from adding extra, unexpected keys to the folder object
    additionalProperties: false
  }
};