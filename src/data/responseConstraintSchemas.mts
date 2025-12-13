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

export const BOOKMARK_CLASSIFICATION_JSON_SCHEMA = {
    type: "object",
    description: "A wrapper object containing the list of classified bookmarks.",
    properties: {
        classifications: {
            type: "array",
            description: "A list of all input bookmarks with their unique, descriptive cluster names.",
            items: {
                type: "object",
                properties: {
                    // Include the ID to verify and map the output
                    id: {
                        type: "string",
                        description: "The ID of the bookmark provided in the input."
                    },
                    // One of the 5 allowed category names
                    cluster_name: {
                        type: "string",
                        description: `Must be EXACTLY one of the 25 category names.
                        1. Development & Tech
                        2. News & Reference
                        3. Entertainment & Media
                        4. Shopping & Lifestyle
                        5. Tools & Utilities
                        6. AI & Machine Learning
                        7. DevOps & Cloud
                        8. Data Science & Analytics
                        9. Hardware & Gadgets
                        10. Design & UX/UI
                        11. Science & Research
                        12. History & Culture
                        13. Finance & Investing
                        14. Education & E-Learning
                        15. Legal & Government
                        16. Health & Fitness
                        17. Travel & Destinations
                        18. Food & Cooking
                        19. Arts & Hobbies
                        20. Gaming
                        21. Social Media & Forums
                        22. Real Estate & Home
                        23. Automotive
                        24. Jobs & Career
                        25. Charity & Non-Profit`,
                    }
                },
                required: ["id", "cluster_name"],
                // Ensures no extra properties are generated, keeping the output clean.
                additionalProperties: false 
            }
        }
    },
    required: ["classifications"],
    additionalProperties: false
};// export const CREATE_BOOKMARK_HIERARCHY_JSON_SCHEMA = {
//     type: "object",
//     description: "A two-level folder hierarchy where keys are top-level folders (Level 1) and values are arrays of their Level 2 sub-folders (which must be the input cluster names).",
//     additionalProperties: { 
//         type: "array",
//         items: {
//             type: "string",
//             description: "A Level 2 sub-folder name from the input list."
//         }
//     }
// };