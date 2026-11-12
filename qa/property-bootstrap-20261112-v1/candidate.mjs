// Reuses the held functional candidate; no driver, network, users or bootstrap.
import {createDaytimeCandidate} from '../property-authority-preflight-20261112-v1/candidate.mjs';
import {createProtectedBootstrap} from './bootstrap.mjs';import {createBootstrapView} from './view-epoch.mjs';
export function createBootstrapCandidate(){return Object.freeze({...createDaytimeCandidate(),bootstrap:createProtectedBootstrap(),makeView:createBootstrapView});}
