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

// Factory function to create the schema with dynamic categories
export const createClassificationSchema = (categories: string[]) => {
    const categoriesString = categories.map((c) => `- ${c}`).join('\n                ');
    return {
        type: "object",
        description: "A wrapper object containing the list of classified bookmarks.",
        properties: {
            classifications: {
                type: "array",
                description: "List of classification results. Format each item as 'ID:CategoryName'.",
                items: {
                    type: "string",
                    description: `Format: 'ID:CategoryName'. CategoryName must be one of:
                ${categoriesString}`
                }
            }
        },
        required: ["classifications"],
        additionalProperties: false
    };
};

export const GENERATE_CATEGORIES_JSON_SCHEMA = {
    type: "object",
    description: "A list of novel bookmark categories generated from a sample.",
    properties: {
        categories: {
            type: "array",
            description: "A list of 15-25 concise, mutually exclusive category names.",
            items: {
                type: "string",
                description: "Category name (e.g., 'Development', 'Cooking', 'Finance')"
            }
        }
    },
    required: ["categories"],
    additionalProperties: false
};

export const BOOKMARK_CLASSIFICATION_JSON_SCHEMA = createClassificationSchema([
    "Development and Tech",
    "News and Reference",
    "Entertainment and Media",
    "Shopping and Lifestyle",
    "Tools and Utilities",
    "AI and Machine Learning",
    "DevOps and Cloud",
    "Data Science and Analytics",
    "Hardware and Gadgets",
    "Design and UX/UI",
    "Science and Research",
    "History and Culture",
    "Finance and Investing",
    "Education and E-Learning",
    "Legal and Government",
    "Health and Fitness",
    "Travel and Destinations",
    "Food and Cooking",
    "Arts and Hobbies",
    "Gaming",
    "Social Media and Forums",
    "Real Estate and Home",
    "Automotive",
    "Jobs and Career",
    "Charity and Non-Profit"
]);