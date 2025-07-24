import { getStorage } from 'firebase/storage';
import { app } from './clients';

export const storage = getStorage(app);
