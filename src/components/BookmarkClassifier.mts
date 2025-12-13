import { CLASSIFY_BOOKMARKS_SYSTEM_PROMPT } from "../data/systemPrompts.mjs";
import { BOOKMARK_CLASSIFICATION_JSON_SCHEMA } from "../data/responseConstraintSchemas.mjs";

// --- CONFIGURATION ---
const BATCH_SIZE = 50;


export default class BookmarkClassifier extends HTMLElement {
    session: any;
    controller: any; // Keep this
    
    // Store original bookmark data (string mapped to ID/full object) for Step 3
    private originalBookmarksMap: Map<string, chrome.bookmarks.BookmarkTreeNode> = new Map();
    
    // Store the clustered output data
    private allClusteredData: { id: string, cluster_name: string }[] = [];
    
    // Store the hierarchy from Step 2
    private folderHierarchy: any = null;


    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        // FIX: Binding 'this' context for event listeners.
        this.createClassifications = this.createClassifications.bind(this);
        this.createFolderHierarchy = this.createFolderHierarchy.bind(this);
        this.clearClassifications = this.clearClassifications.bind(this);
        this.assignBookmarksToFolders = this.assignBookmarksToFolders.bind(this);
    }

    // ... (connectedCallback and disconnectedCallback remain the same)
    async connectedCallback() {
        this.shadowRoot!.innerHTML = `
<div class="bookmark-classifier">
    <style>
        .bookmark-classifier {
          background-color: #f0f0f0;
          padding: 4px;
          margin: 10px 0;
        }
        #results {
            margin-top: 10px;
            white-space: pre-wrap; /* Preserve whitespace for JSON display */
            font-size: 0.9em;
            background: #fff;
            padding: 10px;
            border: 1px solid #ccc;
        }
    </style>
    <p><b>Bookmark Classifier</b></p>
    <p>Create a folder hierarchy based on the metadata of all bookmarks.</p>
    <div id="button-bar">
      <button id="create-classifications">1. Create Classifications</button>
      <button id="create-hierarchy" disabled>2. Create Hierarchy</button>
      <button id="assign-folders" disabled>3. Assign Bookmarks</button>
      <button id="clear-classifications">Clear Data</button>
    </div>
    <div id="results"></div>
</div>
        `;
        // Use bound methods
        this.shadowRoot!.querySelector("#create-classifications")!.addEventListener("click", this.createClassifications);
        this.shadowRoot!.querySelector("#clear-classifications")!.addEventListener("click", this.clearClassifications);
        this.shadowRoot!.querySelector("#create-hierarchy")!.addEventListener("click", this.createFolderHierarchy);
        this.shadowRoot!.querySelector("#assign-folders")!.addEventListener("click", this.assignBookmarksToFolders);
    }
    
    // --- UTILITY METHODS ---

    chunkBookmarkFlatList(array: string[], size: number): string[][] {
        const chunked = [];
        for (let i = 0; i < array.length; i += size) {
            chunked.push(array.slice(i, i + size));
        }
        return chunked;
    }
    
    // ----------------------------------------------------------------------
    // STEP 1: CLASSIFICATION (Batched for Performance)
    // ----------------------------------------------------------------------

    async createClassifications() {
        this.allClusteredData = []; // Reset old data
        this.updateStatus("Status: Fetching bookmarks and starting batch classification...");

        let session: any; 
        
        try {
            // 1. Create a single LLM session
            session = await (globalThis as any).LanguageModel.create(
                {expectedOutputs: [{ type: "text", languages: ["en"]}]}
            );
            
            // 2. Prepare and chunk all bookmark data
            // We ensure strict ID mapping between Prompt and Map
            this.originalBookmarksMap.clear();
            const bookmarksFlat: string[] = [];
            const seenContent = new Set<string>();
            let idCounter = 1;

            const traverse = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
                for (const node of nodes) {
                    if (node.url) {
                        const content = `${node.title} (${node.url})`;
                        // Fix: Deduplicate bookmarks. If we see the same Title+URL pair, skip it.
                        if (!seenContent.has(content)) {
                            seenContent.add(content);
                            const id = String(idCounter++);
                            this.originalBookmarksMap.set(id, node);
                            bookmarksFlat.push(`[${id}] ${content}`); // Send ID in the prompt
                        }
                    }
                    if (node.children) {
                        traverse(node.children);
                    }
                }
            };
            
            traverse(await chrome.bookmarks.getTree());
            const chunks = this.chunkBookmarkFlatList(bookmarksFlat, BATCH_SIZE);
            
            this.updateStatus(`Found ${bookmarksFlat.length} bookmarks. Processing in ${chunks.length} batches.`);

            // 3. Process each chunk in a loop
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const currentBatch = i + 1;
                
                const userPrompt = `
Classify the following bookmarks.
Input format: [ID] Title (URL)
Return JSON with 'id' and 'cluster_name' (must be one of the 25 allowed categories).
(Batch ${currentBatch}/${chunks.length}):
${chunk.join('\n')}
`;

                try {
                    this.updateStatus(`Processing Batch ${currentBatch} (${chunk.length} items)...`);

                    const result = await session.prompt(userPrompt, { 
                        systemInstruction: CLASSIFY_BOOKMARKS_SYSTEM_PROMPT,
                        responseConstraint: BOOKMARK_CLASSIFICATION_JSON_SCHEMA,
                        temperature: 0.2
                    });
                    
                    const parsedResult = JSON.parse(result);
                    // Handle new schema structure: { classifications: [...] }
                    const clusteredData = (parsedResult.classifications || []).map((c: any) => ({
                        id: c.id, 
                        cluster_name: c.cluster_name.trim() 
                    }));
                    this.allClusteredData.push(...clusteredData);
                    
                } catch (error) {
                    console.error(`[bookmark-classifier] Error processing Batch ${currentBatch}:`, error);
                    this.updateStatus(`Error in Batch ${currentBatch}. Check console.`);
                    // Decide whether to break here or continue
                }
            }
            
            this.updateStatus(`Classification complete. ${this.allClusteredData.length} items classified.`);
            this.displayResults(this.allClusteredData);
            this.shadowRoot!.querySelector("#create-hierarchy")!.removeAttribute("disabled");
            
            return this.allClusteredData;

        } catch (error) {
            this.updateStatus(`Fatal Error: ${error}. Check console.`);
            return null; 
        } finally {
            if (session && typeof session.destroy === 'function') {
                await session.destroy();
            }
        }
    }

    // ----------------------------------------------------------------------
    // STEP 2: HIERARCHY GENERATION
    // ----------------------------------------------------------------------

    async createFolderHierarchy() {
        if (this.allClusteredData.length === 0) {
            this.updateStatus("Error: Run classification (Step 1) first.");
            return null;
        }
        this.updateStatus("Status: Generating folder hierarchy...");

        // Since Step 1 is now strictly 5 broad categories, we don't need AI for Step 2.
        // The AI was hallucinating sub-folders that didn't exist in the data.
        // We will simply create a flat hierarchy of the unique categories we found.
        const uniqueClusters = Array.from(new Set(this.allClusteredData.map(item => item.cluster_name)));
        
        const folderHierarchy: { [key: string]: string[] } = {};
        uniqueClusters.forEach(cluster => {
            folderHierarchy[cluster] = []; // No sub-folders, just Top Level
        });

        this.folderHierarchy = folderHierarchy; // Save for Step 3
        
        // Add a small delay to simulate processing so the user sees the status update
        await new Promise(resolve => setTimeout(resolve, 500));

        this.updateStatus("Hierarchy generated successfully (Direct Mapping).");
        this.displayResults(folderHierarchy, "Final Folder Hierarchy");
        this.shadowRoot!.querySelector("#assign-folders")!.removeAttribute("disabled");
        
        return folderHierarchy;
    }

    // ----------------------------------------------------------------------
    // STEP 3: ASSIGNMENT (Programmatic Chrome API Interaction)
    // ----------------------------------------------------------------------
    
    // NOTE: This step assumes the output of listBookmarksFlat was enhanced
    // to include the original BookmarkTreeNode ID, so we can delete the 
    // old link and create a new one inside the new folder.
    
    async assignBookmarksToFolders() {
    
        if (!this.folderHierarchy || this.allClusteredData.length === 0) {
            this.updateStatus("Error: Missing data. Please run Step 1 and Step 2 first.");
            return;
        }

        try {
            // 1. Create the new folder structure
            // We'll put everything under a root "AI Organized" folder in "Other Bookmarks" (ID "2")
            // to avoid messing up the user's existing bar too much, or just under ID "2".
            // Let's create a dedicated root for this session to be safe.
            const timestamp = new Date().toLocaleTimeString().replace(/:/g, "-");
            const sessionRoot = await chrome.bookmarks.create({ 
                parentId: "1", 
                title: `AI Organized (${timestamp})` 
            });

            const clusterToFolderNode = new Map<string, chrome.bookmarks.BookmarkTreeNode>();

            // Iterate over the hierarchy to create folders
            for (const [l1Title, l2List] of Object.entries(this.folderHierarchy)) {
                // Create Level 1 Folder
                const l1Node = await chrome.bookmarks.create({ 
                    parentId: sessionRoot.id, 
                    title: l1Title 
                });
                // Fix: Use exact title as key (trimmed)
                clusterToFolderNode.set(l1Title, l1Node);

                // Create Level 2 Folders
                if (Array.isArray(l2List)) {
                    for (const clusterName of l2List) {
                        const l2Node = await chrome.bookmarks.create({
                            parentId: l1Node.id,
                            title: clusterName as string
                        });
                        clusterToFolderNode.set(clusterName as string, l2Node);
                    }
                }
            }

            // 2. Move Bookmarks
            let moveCount = 0;
            for (const item of this.allClusteredData) {
                const originalNode = this.originalBookmarksMap.get(item.id);
                const targetFolder = clusterToFolderNode.get(item.cluster_name);

                if (originalNode && targetFolder) {
                    try {
                        // FIX: Use 'create' instead of 'move' to preserve original bookmarks
                        await chrome.bookmarks.create({
                            parentId: targetFolder.id,
                            title: originalNode.title,
                            url: originalNode.url 
                        });
                        moveCount++;
                    } catch (err) {
                        console.warn(`Failed to copy bookmark ${originalNode.id}:`, err);
                    }
                } else {
                    console.debug("Skipping item: Node or Target Folder not found", item);
                    if (!targetFolder) console.debug(`Available Keys:`, Array.from(clusterToFolderNode.keys()));
                }
            }

            this.updateStatus(`Success! Copied ${moveCount} bookmarks to "Bookmarks Bar > AI Organized (${timestamp})".`);

        } catch (error) {
            console.error(error);
            this.updateStatus(`Error assigning bookmarks: ${error}`);
        }
    }

    // --- HELPER METHODS FOR UI ---

    clearClassifications() {
        this.allClusteredData = [];
        this.updateStatus("Data Cleared.");
        this.shadowRoot!.querySelector("#create-hierarchy")!.setAttribute("disabled", "true");
        this.shadowRoot!.querySelector("#assign-folders")!.setAttribute("disabled", "true");
    }

// Helper to display status updates
    updateStatus(message: string) {
        // Target the correct ID: #results
        const resultsDiv = this.shadowRoot!.querySelector("#results") as HTMLElement;
        const timestamp = new Date().toLocaleTimeString();
        resultsDiv.innerHTML = `<p>[${timestamp}] ${message}</p>`; // Use innerHTML to replace status
    }

    // Helper to display the final JSON output
    displayResults(data: any, title = "Clustering Results") {
        // Target the correct ID: #results (or another existing ID)
        const resultsDiv = this.shadowRoot!.querySelector("#results") as HTMLElement;
        const jsonString = JSON.stringify(data, null, 2);
        
        // Append the results to the existing status messages
        resultsDiv.innerHTML += `<h3>${title}</h3><pre>${jsonString}</pre>`; 
        // If you want to replace the status, use '=' instead of '+='
    }
}

customElements.define("bookmark-classifier", BookmarkClassifier);