import '@testing-library/jest-dom';
import dotenv from 'dotenv';
import path from 'path';
import { neutraliserBaseDistante } from './garde-base';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// #548 : chaque worker recharge le `.env` ; on neutralise de nouveau, au cas
// où la variable n'existait pas encore quand la config de Vitest l'a vérifiée.
neutraliserBaseDistante(process.env);
