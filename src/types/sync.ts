/**
 * Result of a sync operation, describing what changed
 */
export interface SyncDelta<TEntity> {
  /** Entities that were updated from the server */
  updated: TEntity[];

  /** New entities pulled from the server */
  created: TEntity[];

  /** IDs of entities deleted on the server */
  deleted: string[];

  /** IDs whose pending changes were confirmed by server */
  confirmed: string[];

  /** true if no changes occurred (updated + created + deleted all empty) */
  unchanged: boolean;

  /** Server timestamp for checkpoint update */
  serverTimestamp: string;

  /** New checkpoint version for incremental sync */
  checkpoint?: import('./api').Checkpoint;
}

/**
 * Internal accumulator during sync processing
 */
export interface SyncAccumulator<TEntity> {
  updated: Map<string, TEntity>;
  created: Map<string, TEntity>;
  deleted: Set<string>;
  confirmed: Set<string>;
}
