import React from 'react';
import { EmptyState, PageHeading, StatusPill } from '../components/PortalUI';
import { useMemberData } from '../lib/memberContext';
import { formatCalendarDate, formatNaira } from '../lib/config';
export default function MemberHistoryPage(){const{data}=useMemberData();return <div><PageHeading eyebrow="Records" title="Membership history" copy="Every completed and previous membership stays available here."/>{data.history.length===0?<EmptyState title="No previous memberships" copy="Your completed plans will appear here after your first renewal."/>:<div className="history-list">{data.history.map(m=><article className="history-card" key={m.id}><div><p className="eyebrow">{formatNaira(m.price)}</p><h2>{m.plan_name}</h2><p>{formatCalendarDate(m.start_date,'Pending')} <span>→</span> {formatCalendarDate(m.end_date,'Pending')}</p></div><StatusPill status={m.status}/></article>)}</div>}</div>}
