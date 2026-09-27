import React from 'react';
import { UserRound } from 'lucide-react';
import type { MembershipStatus, Profile } from '../lib/types';
export function StatusPill({ status }: { status: MembershipStatus }) { return <span className={`status-pill status-${status}`}><i />{status}</span>; }
export function MemberPhoto({ profile, size = 'lg' }: { profile: Profile; size?: 'sm'|'md'|'lg' }) { return profile.photo_url ? <img src={profile.photo_url} alt={`${profile.full_name} profile`} className={`member-photo member-photo-${size}`} /> : <div className={`member-photo member-photo-${size} member-photo-placeholder`}><UserRound /></div>; }
export function PageHeading({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: React.ReactNode }) { return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{copy && <p className="page-copy">{copy}</p>}</div>{action}</div>; }
export function EmptyState({ title, copy }: { title: string; copy: string }) { return <div className="empty-state"><h3>{title}</h3><p>{copy}</p></div>; }
