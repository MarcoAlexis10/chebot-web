// Extend the existing held composition, not a new gateway or application.
import {createFirstPropertyCandidate} from '../first-property-20261112-v1/candidate.mjs';
import {createProtectedPropertyAuthority} from './authority-source.mjs';
import {createIndependentReadBoundary} from './read-cut.mjs';
import {createProtectedOriginalComparator} from './original-reference.mjs';
export function createDaytimeCandidate(){const prior=createFirstPropertyCandidate();return Object.freeze({...prior,propertyAuthority:createProtectedPropertyAuthority(),captureReader:createIndependentReadBoundary(),originalComparator:createProtectedOriginalComparator()});}
