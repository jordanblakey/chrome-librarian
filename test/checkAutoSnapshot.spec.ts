
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkAutoSnapshot } from '../src/utils/checkAutoSnapshot.mjs';

// Mock analyzeTree as it is a dependency of checkAutoSnapshot
vi.mock('./common.mjs', () => ({}));
vi.mock('../src/utils/treeUtils.mjs', () => ({
  analyzeTree: vi.fn(() => ({ bookmarks: 10, folders: 2, maxDepth: 2, avgDepth: 1.5 }))
}));

describe('checkAutoSnapshot', () => {
    // Mock chrome.storage.local methods
    const getMock = vi.fn();
    const setMock = vi.fn();
    const removeMock = vi.fn();

    // Mock chrome.bookmarks
    const getTreeMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup global chrome mocks
        global.chrome = {
            storage: {
                local: {
                    get: getMock,
                    set: setMock,
                    remove: removeMock,
                }
            },
            bookmarks: {
                getTree: getTreeMock
            }
        } as any;

        // Default: no existing snapshots
        getMock.mockResolvedValue({});
        // Default: return a dummy tree
        getTreeMock.mockResolvedValue([{ title: 'root' }]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should create a new snapshot if no auto-snapshots exist', async () => {
        await checkAutoSnapshot();

        expect(getMock).toHaveBeenCalledWith(null);
        expect(getTreeMock).toHaveBeenCalled();
        expect(setMock).toHaveBeenCalledTimes(1);
        
        // Verify key structure and title
        const callArg = setMock.mock.calls[0][0];
        const key = Object.keys(callArg)[0];
        expect(key).toMatch(/^bookmarkSnapshot_\d+$/);
        expect(callArg[key].title).toBe('Autosave');
    });

    it('should not create a snapshot if a recent autosave exists (< 24 hours)', async () => {
        const now = Date.now();
        const recentTimestamp = now - 1000 * 60 * 60; // 1 hour ago
        
        getMock.mockResolvedValue({
            [`bookmarkSnapshot_${recentTimestamp}`]: {
                timestamp: recentTimestamp,
                title: 'Autosave',
                isPinned: false,
                data: {},
                tree: []
            }
        });

        await checkAutoSnapshot();

        expect(setMock).not.toHaveBeenCalled();
    });

    it('should create a snapshot if the last autosave is old (> 24 hours)', async () => {
        const now = Date.now();
        const oldTimestamp = now - 1000 * 60 * 60 * 25; // 25 hours ago
        
        getMock.mockResolvedValue({
            [`bookmarkSnapshot_${oldTimestamp}`]: {
                timestamp: oldTimestamp,
                title: 'Autosave',
                isPinned: false,
                data: {},
                tree: []
            }
        });

        await checkAutoSnapshot();

        expect(setMock).toHaveBeenCalledTimes(1);
    });

    it('should cleanup old snapshots if there are more than 3', async () => {
         // Create 4 existing snapshots
         const now = Date.now();
         const snapshots: Record<string, any> = {};
         
         // Create 4 existing snapshots with timestamps: 25, 26, 27, 28 hours ago.
         // Logic: 
         // 1. Newest (25h ago) is > 24h old -> Logic forces creation of a new snapshot.
         // 2. Total snapshots become 5.
         // 3. Cleanup logic retains the 3 newest and deletes the rest.
         
         // Expectation: 
         // - 1 new snapshot created (Total 5)
         // - 2 oldest snapshots deleted (Total 3 remain)
         
         const times = [25, 26, 27, 28].map(h => now - h * 3600 * 1000);
         
         times.forEach(t => {
             snapshots[`bookmarkSnapshot_${t}`] = {
                 timestamp: t,
                 title: 'Autosave',
                 isPinned: false,
                 data: {}, 
                 tree: []
             };
         });

         getMock.mockResolvedValue(snapshots);

         await checkAutoSnapshot();

         expect(setMock).toHaveBeenCalledTimes(1); // Created one
         
         // We had 4. Created 1. Total 5. 
         // Should keep 3. Delete 2.
         expect(removeMock).toHaveBeenCalledTimes(2);
         
         // The deleted ones should be the oldest (27 and 28 hours ago)
         const sortedTimes = [...times].sort((a,b) => b-a); // 25, 26, 27, 28 (Descending)
         // Newest is created (let's say 0).
         // List: [0, 25, 26, 27, 28]
         // Keep: 0, 25, 26
         // Delete: 27, 28
         
         const deletedKeys = removeMock.mock.calls.map(call => call[0]);
         expect(deletedKeys).toContain(`bookmarkSnapshot_${times[2]}`);
         expect(deletedKeys).toContain(`bookmarkSnapshot_${times[3]}`);
    });
});
