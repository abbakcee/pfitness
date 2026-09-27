import { useOutletContext } from 'react-router-dom';
import type { MemberOverview } from './types';
export interface MemberContext { data: MemberOverview; refresh: () => Promise<void> }
export function useMemberData(){ return useOutletContext<MemberContext>(); }
