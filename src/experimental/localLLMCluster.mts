// src/services/LocalLLMCluster.ts

interface QueueTask {
  dataChunk: any[];
  systemPrompt: string;
  resolve: (value: any[]) => void;
  reject: (reason?: any) => void;
  retryCount: number;
}

const BOOKMARK_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      title: { type: "string" },
      category: { 
        type: "string", 
        enum: ["Dev", "News", "Cooking", "Finance", "Other"] // Optional: Enforce specific categories
      },
      url: { type: "string" } // Pass-through for context
    },
    required: ["title", "category"]
  }
};

export class LocalLLMCluster {
  private concurrency: number;
  private queue: QueueTask[] = [];
  private activeWorkers: number = 0;
  private maxRetries: number = 1; // Give the model one second chance

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
  }

  /**
   * The main entry point. 
   * Breaks a massive array into chunks and processes them in parallel (up to limits).
   */
  async mapReduce(
    allItems: any[], 
    chunkSize: number, 
    systemPrompt: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<any[]> {
    
    const chunks = this.chunkArray(allItems, chunkSize);
    let completedChunks = 0;

    // Wrap the tasks to track progress
    const tasks = chunks.map(chunk => {
      return this.enqueueTask(chunk, systemPrompt).then(result => {
        completedChunks++;
        if (onProgress) onProgress(completedChunks * chunkSize, allItems.length);
        return result;
      });
    });

    // Wait for the entire cluster to finish
    const results = await Promise.all(tasks);
    
    // Flatten the array of arrays into one master list
    return results.flat();
  }

  private enqueueTask(dataChunk: any[], systemPrompt: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.queue.push({ 
        dataChunk, 
        systemPrompt, 
        resolve, 
        reject,
        retryCount: 0 
      });
      this.processQueue();
    });
  }
  
  // Add this property to your class
  private workerIdCounter = 1;

  private async processQueue() {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) return;

    // Assign a unique badge to this "thread"
    const workerId = this.workerIdCounter++;
    this.activeWorkers++;
    const task = this.queue.shift()!;

    const label = `[Worker ${workerId}]`;
    console.time(label); // Start a timer

    try {
      console.log(`${label} 🟢 STARTED batch of ${task.dataChunk.length} items.`);

      // 1. Create a FRESH session (Stateless execution)
      // @ts-ignore - assuming window.ai types are global or strictly typed elsewhere
      const session = await LanguageModel.create({
        systemPrompt: task.systemPrompt,
        expectedInputs: [{
          type: "text", languages: ["en"]
        }]
      });

      // 2. Prompt with the JSON chunk
      // We disable streaming here because we need the full valid JSON to parse
      const response = await session.prompt(
        JSON.stringify(task.dataChunk), 
        {
          responseConstraint: BOOKMARK_SCHEMA
        }
      );
      
      // 3. Clean up the output (Models love to add markdown blocks)
      const cleanJson = this.stripMarkdown(response);
      const parsedData = JSON.parse(cleanJson);

      // 4. Cleanup Memory immediately
      session.destroy();
      task.resolve(parsedData);

      console.log(`${label} 🏁 FINISHED.`);
    } catch (err) {
      console.error(`${label} 💥 CRASHED:`, err);
      console.warn(`Worker failed (Attempt ${task.retryCount + 1}):`, err);
      
      if (task.retryCount < this.maxRetries) {
        task.retryCount++;
        this.queue.push(task); // Re-queue at the back
      } else {
        // Fallback: Resolve with empty array so we don't crash the whole job
        console.error("Task failed permanently. Skipping chunk.");
        task.resolve([]); 
      }
    } finally {
      console.timeEnd(label); // Prints exact duration
      this.activeWorkers--;
      this.processQueue(); // Pick up next job
    }
  }

  private stripMarkdown(text: string): string {
    // Removes ```json ... ``` or just ``` ... ```
    return text.replace(/```json|```/g, '').trim();
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (v, i) =>
      array.slice(i * size, i * size + size)
    );
  }
}

export async function batchCategorizeBookmarksParallelPrototype(bookmarks: any[]) {
  const t1 = performance.now()
  const cluster = new LocalLLMCluster(1); // Run 3 parallel sessions

  const systemPrompt = `You are a Bookmark Organizer. 
  Classify these bookmarks into folders. 
  Output ONLY valid JSON array.`;

  console.log("Starting Cluster...");

  try {
    const organizedBookmarks = await cluster.mapReduce(
      bookmarks, 
      15, // Batch size (keep small to avoid token limits)
      systemPrompt, 
      (completed, total) => {
        console.log(`Progress: ${Math.min(completed, total)} / ${total}`);
      }
    );

    console.log("Cluster Finished!", organizedBookmarks);
    console.log("Total Time:", performance.now() - t1);
    return organizedBookmarks;
  } catch (e) {
    console.error("Cluster exploded:", e);
  }
}
