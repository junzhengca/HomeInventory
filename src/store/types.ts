import type { rootReducer } from './reducers';

// Infer the `RootState` type from the root reducer
export type RootState = ReturnType<typeof rootReducer>;

