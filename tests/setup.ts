import '@testing-library/jest-dom';
import dotenv from 'dotenv';
import path from 'path';
import { neutraliserBaseDistante, effacerServicesExternes } from './garde-base';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// #548 : chaque worker recharge le `.env`. La config de Vitest a déjà
// neutralisé la base, mais elle a *supprimé* les identifiants des services
// externes : dotenv les remet ici, il faut donc les retirer de nouveau.
neutraliserBaseDistante(process.env);
effacerServicesExternes(process.env);
