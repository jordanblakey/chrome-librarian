import { CLASSIFY_BOOKMARKS_SYSTEM_PROMPT, GENERATE_CATEGORIES_SYSTEM_PROMPT } from "../data/systemPrompts.mjs";
import { BOOKMARK_CLASSIFICATION_JSON_SCHEMA, GENERATE_CATEGORIES_JSON_SCHEMA, createClassificationSchema } from "../data/responseConstraintSchemas.mjs";
import { showBadgeError, showBadgeSuccess, startExtensionSpinner, getWeightedSample as getWeightedBookmarkSample } from "../utils/common.mjs";

const BATCH_SIZE = 10;

type FolderHierarchy = Record<string, string | string[]>;

export default class BookmarkClassifier extends HTMLElement {
    private originalBookmarksMap: Map<string, chrome.bookmarks.BookmarkTreeNode> = new Map();
    private allClusteredData: { id: string, cluster_name: string }[] = [];
    private folderHierarchy: FolderHierarchy | null = null;
    private activeSchema: Record<string, any> = BOOKMARK_CLASSIFICATION_JSON_SCHEMA;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.render();
        this.bindEvents();
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <div class="bookmark-classifier">
                <link rel="stylesheet" href="../../assets/css/components.css">
                <p><b>Bookmark Classifier</b></p>
                <p>Create a folder hierarchy based on the metadata of all bookmarks.</p>
                <div id="button-bar">
                <button id="generate-novel-schema">0. Generate Categories</button>
                <button id="create-classifications">1. Create Classifications</button>
                <button id="create-hierarchy" disabled>2. Create Hierarchy</button>
                <button id="assign-folders" disabled>3. Assign Bookmarks</button>
                <button id="clear-classifications" class="secondary">Clear Data</button>
                </div>
                <div id="results"></div>
            </div>
        `;
    }

    private bindEvents() {
        this.shadowRoot!.querySelector("#create-classifications")!.addEventListener("click", this.createClassifications.bind(this));
        this.shadowRoot!.querySelector("#clear-classifications")!.addEventListener("click", this.clearClassifications.bind(this));
        this.shadowRoot!.querySelector("#create-hierarchy")!.addEventListener("click", this.createFolderHierarchy.bind(this));
        this.shadowRoot!.querySelector("#assign-folders")!.addEventListener("click", this.assignBookmarksToFolders.bind(this));
        this.shadowRoot!.querySelector("#generate-novel-schema")!.addEventListener("click", this.generateNovelSchema.bind(this));
    }
    
    // ----------------------------------------------------------------------
    // STEP 0: NOVEL CATEGORY GENERATION (Optional)
    // ----------------------------------------------------------------------

    async generateNovelSchema() {
        this.updateStatus("Status: Sampling bookmarks to generate novel categories...");

        const stopSpinner = startExtensionSpinner();
        const startTime = performance.now();

        try {
            const bookmarkTree = await chrome.bookmarks.getTree();
            const sample = getWeightedBookmarkSample(bookmarkTree, 200);
            const sampleText = sample.map(n => n.url ? `Bookmark: ${n.title} (${n.url})` : `Folder: ${n.title}`).join('\n');

            const session = await (window as any).LanguageModel.create({
                systemPrompt: GENERATE_CATEGORIES_SYSTEM_PROMPT,
                expectedOutputs: [{ type: "text", languages: ["en"], schema: GENERATE_CATEGORIES_JSON_SCHEMA }]
            });
            const prompt = `Here is a sample of my bookmarks. detailed list:\n${sampleText}`;

            const result = await session.prompt(prompt, {
                responseConstraint: GENERATE_CATEGORIES_JSON_SCHEMA
            });
            console.debug("Novel Categories Raw Result:", result);
            const parsed = JSON.parse(result);
            const newCategories = parsed.categories;
            const totalTimeSeconds = ((performance.now() - startTime) / 1000).toFixed(2);
            
            if (!newCategories || !Array.isArray(newCategories) || newCategories.length === 0) {
                this.updateStatus("Failed to generate categories from sample.");
            } else {
                this.updateStatus(`Generated ${newCategories.length} novel categories | Time: ${totalTimeSeconds}s`);
                this.displayResults(newCategories, "Novel Categories");
                this.activeSchema = createClassificationSchema(newCategories);
            }
        } catch (error) {
            this.updateStatus(`Error generating categories, using default schema: ${error}`);
            this.activeSchema = BOOKMARK_CLASSIFICATION_JSON_SCHEMA;
        } finally {
            stopSpinner();
            showBadgeSuccess();
            return this.activeSchema;
        }
    }

    // ----------------------------------------------------------------------
    // STEP 1: CLASSIFICATION (Batched for Performance)
    // ----------------------------------------------------------------------

    async createClassifications() {
        this.allClusteredData = []; // Reset old data
        this.updateStatus("Status: Fetching bookmarks and starting batch classification...");
        
        const stopSpinner = startExtensionSpinner();

        const startTime = performance.now();
        const batchDurations: number[] = [];

        let session: any; 
        
        try {
            // 1. Create a BASE LLM session with the System Prompt
            session = await (window as any).LanguageModel.create({
                systemPrompt: CLASSIFY_BOOKMARKS_SYSTEM_PROMPT, // Pre-load system prompt
                expectedOutputs: [{ type: "text", languages: ["en"] }]
            });
            
            // 2. Prepare and chunk all bookmark data
            this.originalBookmarksMap.clear();
            const inputTree = await chrome.bookmarks.getTree();
            const bookmarksFlat = this.processBookmarks(inputTree);
            
            const chunks = [];
            for (let i = 0; i < bookmarksFlat.length; i += BATCH_SIZE) {
                chunks.push(bookmarksFlat.slice(i, i + BATCH_SIZE));
            }
            
            this.updateStatus(`Found ${bookmarksFlat.length} bookmarks. Processing in ${chunks.length} batches.`);

            // 3. Process each chunk sequentially (GPU limits parallelism)
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const currentBatch = i + 1;
                
                const userPrompt = `
Classify the following bookmarks.
Input format: [ID] Title (URL)
Return JSON with a 'classifications' array of strings.
Format each string EXACTLY as: "ID:CategoryName"
(Batch ${currentBatch}/${chunks.length}):
${chunk.join('\n')}
`;
                let batchSession: any;
                const batchStartTime = performance.now();
                try {
                    let statusMsg = `Processing Batch ${currentBatch} (${chunk.length} items)...`;
                    if (batchDurations.length > 0) {
                        const lastDuration = batchDurations[batchDurations.length - 1];
                        statusMsg += ` (Last Batch: ${(lastDuration / 1000).toFixed(2)}s)`;
                    }
                    this.updateStatus(statusMsg);

                    // CLONE the base session. New context for each batch.
                    batchSession = await session.clone();

                    const result = await batchSession.prompt(userPrompt, { 
                        // systemInstruction is already in the base session
                        responseConstraint: this.activeSchema,
                        temperature: 0.2 // Low temperature for deterministic speed
                    });
                    const parsedResult = JSON.parse(result);
                    
                    // Handle Compact Schema: ["ID:Category", ...]
                    const clusteredData: { id: string, cluster_name: string }[] = [];
                    
                    for (const itemStr of (parsedResult.classifications || [])) {
                        const parts = itemStr.split(":");
                        if (parts.length >= 2) {
                            const id = parts[0].trim();
                            // Join rest in case category has colon (unlikely but safe)
                            const cluster_name = parts.slice(1).join(":").trim();
                            clusteredData.push({ id, cluster_name });
                        }
                    }

                    this.allClusteredData.push(...clusteredData);
                    
                    const batchEndTime = performance.now();
                    const duration = batchEndTime - batchStartTime;
                    batchDurations.push(duration);
                    
                } catch (error) {
                    console.warn(`[bookmark-classifier] Error processing Batch ${currentBatch}:`, error);
                    this.updateStatus(`Error in Batch ${currentBatch}. Check console.`);
                } finally {
                    if (batchSession && typeof batchSession.destroy === 'function') {
                        await batchSession.destroy();
                    }
                }
            }
            
            const totalTime = performance.now() - startTime;
            const avgBatchTime = batchDurations.reduce((a, b) => a + b, 0) / batchDurations.length || 0;
            
            this.updateStatus(`Classification complete | Input: ${this.originalBookmarksMap.size} | Organized: ${this.allClusteredData.length} | Total Time: ${(totalTime / 1000).toFixed(2)}s | Avg Batch: ${(avgBatchTime / 1000).toFixed(2)}s`);
            this.displayResults(this.allClusteredData);
            this.shadowRoot!.querySelector("#create-hierarchy")!.removeAttribute("disabled");
            stopSpinner();
            showBadgeSuccess();

            return this.allClusteredData;

        } catch (error) {
            this.updateStatus(`Fatal Error: ${error}. Check console.`);
            stopSpinner();
            showBadgeError();
            return null; 
        } finally {
            setTimeout(() => { chrome.action.setBadgeText({ text: "" }); }, 10000);
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
        // Count bookmarks per category for display
        const counts: Record<string, number> = {};
        for (const item of this.allClusteredData) {
            counts[item.cluster_name] = (counts[item.cluster_name] || 0) + 1;
        }
        
        // Save to hierarchy (Value is string description for display, or array of strings for subfolders)
        const folderHierarchy: FolderHierarchy = {};
        
        // Sort by count descending
        Object.entries(counts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([cluster, count]) => {
                folderHierarchy[cluster] = `${count} bookmarks`;
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
            // We'll put everything under a root "AI Organized" folder
            // to avoid messing up the user's existing bar too much.
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

            // 2. Re-create Bookmarks in New Folders
            let moveCount = 0;
            for (const item of this.allClusteredData) {
                const originalNode = this.originalBookmarksMap.get(item.id);
                const targetFolder = clusterToFolderNode.get(item.cluster_name);

                if (originalNode && targetFolder) {
                    try {
                        // Use 'create' instead of 'move' to preserve original bookmarks
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
            console.warn(error);
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

    updateStatus(message: string) {
        const resultsDiv = this.shadowRoot!.querySelector("#results") as HTMLElement;
        const timestamp = new Date().toLocaleTimeString();
        resultsDiv.innerHTML = `<p>[${timestamp}] ${message}</p>`; // Use innerHTML to replace status
    }

    displayResults(data: any, title = "Clustering Results") {
        const resultsDiv = this.shadowRoot!.querySelector("#results") as HTMLElement;
        const jsonString = JSON.stringify(data, null, 2);
        resultsDiv.innerHTML += `<h3>${title}</h3><pre>${jsonString}</pre>`; 
    }

    private processBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[]): string[] {
        const bookmarksFlat: string[] = [];
        const seenContent = new Set<string>();
        let idCounter = 1;

        const traverse = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
            for (const node of nodes) {
                if (node.url) {
                    const content = `${node.title} (${node.url})`;
                    if (!seenContent.has(content)) {
                        seenContent.add(content);
                        const id = String(idCounter++);
                        this.originalBookmarksMap.set(id, node);

                        // OPTIMIZATION: Aggressive Token Scrubbing
                        let cleanUrl = node.url.replace(/^(https?:\/\/)?(www\.)?/, '');
                        if (cleanUrl.length > 40) cleanUrl = cleanUrl.substring(0, 37) + "...";
                        let cleanTitle = node.title.trim();
                        if (cleanTitle.length > 30) cleanTitle = cleanTitle.substring(0, 27) + "...";

                        // Compact format: "[ID] Title (URL)" -> "[1]React Docs(react.dev)"
                        bookmarksFlat.push(`[${id}]${cleanTitle}(${cleanUrl})`);
                    }
                }
                if (node.children) {
                    traverse(node.children);
                }
            }
        };
        
        traverse(nodes);
        return bookmarksFlat;
    }
}

customElements.define("bookmark-classifier", BookmarkClassifier);