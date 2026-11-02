// api/portal-data.js
// Vercel Serverless Function: Fetches unified client portal matters, litigations, events, and financials.
import { createClient } from '@supabase/supabase-js';

const CENTRAL_SUPABASE_URL = process.env.VITE_CENTRAL_SUPABASE_URL || process.env.SUPABASE_URL || 'https://eafciegebhuhoneypsqy.supabase.co';
const CENTRAL_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZmNpZWdlYmh1aG9uZXlwc3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA5NTU1NywiZXhwIjoyMTA2NjcxNTU3fQ.rxJJ-BO6bAeJYBu-tonvwxNZ3rh1D5ugjIpQMPk4qNo';

const admin = createClient(CENTRAL_SUPABASE_URL, CENTRAL_SERVICE_KEY, {
  auth: { persistSession: false }
});

const PROSECUTION_STAGES = {
  IP_PATENT: [
    'Provisional Filed',
    'Complete Specification Filed',
    'Request for Examination',
    'FER Response Submitted',
    'Hearing & Written Submissions',
    'Patent Granted',
  ],
  IP_SOFT: [
    'Application Filed',
    'Formality Check Passed',
    'Examination Report Answered',
    'Journal Publication',
    'Trademark Registered',
  ],
  LITIGATION: [
    'Suit / Petition Filed',
    'Summons / Notice Issued',
    'Pleadings & Objections',
    'Arguments & Evidence',
    'Final Order / Decree',
  ],
  AGREEMENT: [
    'Term Sheet Finalized',
    'First Draft Formulated',
    'Counterparty Review & Redlines',
    'Execution & Sign-Off',
    'Closed / Implemented',
  ],
};

function calculateStageProgress(department, events = [], litCase = null) {
  const stageList = PROSECUTION_STAGES[department] || PROSECUTION_STAGES['LITIGATION'];
  const totalStages = stageList.length;

  if (department === 'LITIGATION' && litCase?.current_stage) {
    const cs = litCase.current_stage.toLowerCase();
    let stageIdx = 0;
    if (cs.includes('decree') || cs.includes('order') || cs.includes('disposed') || cs.includes('judgment')) stageIdx = 4;
    else if (cs.includes('argument') || cs.includes('evidence') || cs.includes('hearing') || cs.includes('trial')) stageIdx = 3;
    else if (cs.includes('pleading') || cs.includes('objection') || cs.includes('reply') || cs.includes('rejoinder') || cs.includes('ws')) stageIdx = 2;
    else if (cs.includes('summons') || cs.includes('notice') || cs.includes('admission')) stageIdx = 1;
    else stageIdx = 0;

    return {
      currentStage: litCase.current_stage,
      stageIndex: stageIdx,
      totalStages,
      percentage: Math.round(((stageIdx + 1) / totalStages) * 100),
    };
  }

  if (!events || events.length === 0) {
    return {
      currentStage: stageList[0],
      stageIndex: 0,
      totalStages,
      percentage: Math.round((1 / totalStages) * 100),
    };
  }

  const eventCodes = events.map((e) => (e.event_code || '').toUpperCase());
  let stageIndex = 0;
  if (department === 'IP_PATENT') {
    if (eventCodes.some((c) => c.includes('GRANT'))) stageIndex = 5;
    else if (eventCodes.some((c) => c.includes('HEARING') || c.includes('WS'))) stageIndex = 4;
    else if (eventCodes.some((c) => c.includes('FER_REPLY') || c.includes('FER'))) stageIndex = 3;
    else if (eventCodes.some((c) => c.includes('RFE'))) stageIndex = 2;
    else if (eventCodes.some((c) => c.includes('CS_FILED'))) stageIndex = 1;
  } else if (department === 'IP_SOFT') {
    if (eventCodes.some((c) => c.includes('GRANT') || c.includes('REGISTERED'))) stageIndex = 4;
    else if (eventCodes.some((c) => c.includes('PUBLISHED') || c.includes('JOURNAL'))) stageIndex = 3;
    else if (eventCodes.some((c) => c.includes('FER') || c.includes('REPLY'))) stageIndex = 2;
    else if (eventCodes.some((c) => c.includes('FORMALITY'))) stageIndex = 1;
  } else if (department === 'LITIGATION') {
    if (eventCodes.some((c) => c.includes('DECREE') || c.includes('ORDER') || c.includes('JUDGMENT'))) stageIndex = 4;
    else if (eventCodes.some((c) => c.includes('ARGUMENT') || c.includes('EVIDENCE'))) stageIndex = 3;
    else if (eventCodes.some((c) => c.includes('SUMMONS') || c.includes('NOTICE'))) stageIndex = 1;
  } else {
    stageIndex = Math.min(events.length - 1, totalStages - 1);
  }

  return {
    currentStage: stageList[stageIndex],
    stageIndex,
    totalStages,
    percentage: Math.round(((stageIndex + 1) / totalStages) * 100),
  };
}

export default async function handler(req, res) {
  // CORS & Options
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-id');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let targetClientId = req.query?.clientId || req.headers?.['x-client-id'];

    if (!targetClientId && req.url) {
      try {
        const urlObj = new URL(req.url, 'http://localhost');
        targetClientId = urlObj.searchParams.get('clientId');
      } catch (e) {}
    }

    // If Authorization header present, resolve and verify client ID
    if (req.headers?.authorization) {
      const token = req.headers.authorization.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        try {
          const { data: { user } } = await admin.auth.getUser(token);
          if (user?.user_metadata?.client_id) {
            targetClientId = user.user_metadata.client_id;
          }
        } catch (e) {
          console.warn('Auth token resolution warning:', e.message);
        }
      }
    }

    if (!targetClientId) {
      return res.status(400).json({ error: 'Client ID is required.' });
    }

    // 1. Fetch Client Profile
    const { data: client, error: clientErr } = await admin
      .schema('core')
      .from('clients')
      .select('*')
      .eq('id', targetClientId)
      .maybeSingle();

    if (clientErr) throw clientErr;

    // 2. Fetch Project Codes (Matters across all 4 departments)
    const { data: projectCodes, error: pcErr } = await admin
      .schema('core')
      .from('project_codes')
      .select('*')
      .eq('client_id', targetClientId)
      .order('created_at', { ascending: false });

    if (pcErr) throw pcErr;

    const matters = projectCodes || [];
    const matterIds = matters.map((m) => m.id);

    // 3. Batch fetch linked Litigator Cases
    let litCasesByProjectId = {};
    if (matterIds.length > 0) {
      try {
        const { data: litCases } = await admin
          .schema('litigator')
          .from('cases')
          .select('*')
          .in('project_code_id', matterIds);

        if (litCases) {
          litCases.forEach((lc) => {
            litCasesByProjectId[lc.project_code_id] = lc;
          });
        }
      } catch (e) {
        console.warn('Litigator cases lookup warning:', e.message);
      }
    }

    // 4. Batch fetch Matter Events
    let eventsByMatterId = {};
    let allEvents = [];
    if (matterIds.length > 0) {
      try {
        const { data: events } = await admin
          .schema('core')
          .from('matter_events')
          .select('*')
          .in('project_code_id', matterIds)
          .eq('client_visible', true)
          .order('occurred_at', { ascending: false });

        if (events) {
          allEvents = events.map((ev) => {
            const linkedMatter = matters.find((m) => m.id === ev.project_code_id);
            return {
              ...ev,
              project_codes: linkedMatter ? {
                client_id: targetClientId,
                code: linkedMatter.code,
                title: linkedMatter.title,
              } : null,
            };
          });

          events.forEach((ev) => {
            if (!eventsByMatterId[ev.project_code_id]) {
              eventsByMatterId[ev.project_code_id] = [];
            }
            eventsByMatterId[ev.project_code_id].push(ev);
          });
        }
      } catch (e) {
        console.warn('Matter events lookup warning:', e.message);
      }
    }

    // 5. Batch fetch Billing Stages
    let billingStages = [];
    if (matterIds.length > 0) {
      try {
        const { data: stages } = await admin
          .schema('finance')
          .from('billing_stages')
          .select('*')
          .in('project_code_id', matterIds)
          .order('created_at', { ascending: false });

        if (stages) billingStages = stages;
      } catch (e) {
        console.warn('Billing stages lookup warning:', e.message);
      }
    }

    // 6. Batch fetch Recoverable Costs
    let recoverableCosts = [];
    if (matterIds.length > 0) {
      try {
        const { data: costs } = await admin
          .schema('core')
          .from('recoverable_costs')
          .select('*')
          .in('project_code_id', matterIds)
          .order('cost_date', { ascending: false });

        if (costs) recoverableCosts = costs;
      } catch (e) {
        console.warn('Recoverable costs lookup warning:', e.message);
      }
    }

    // 7. Batch fetch Documents
    let documents = [];
    try {
      let docQuery = admin
        .schema('core')
        .from('documents')
        .select('*')
        .eq('client_shared', true)
        .order('uploaded_at', { ascending: false });

      if (matterIds.length > 0) {
        docQuery = docQuery.or(`project_code_id.in.(${matterIds.join(',')}),project_code_id.is.null`);
      }

      const { data: docs } = await docQuery;
      if (docs) documents = docs;
    } catch (e) {
      console.warn('Documents lookup warning:', e.message);
    }

    // Enrich Matters with litigation case data and progress calculation
    const enrichedMatters = matters.map((m) => {
      const matterEvents = eventsByMatterId[m.id] || [];
      const litCase = litCasesByProjectId[m.id] || null;

      return {
        ...m,
        litigation_case: litCase ? {
          court: litCase.court,
          bench: litCase.bench,
          case_number: litCase.case_number,
          cnr_number: litCase.cnr_number,
          case_type: litCase.case_type,
          client_role: litCase.client_role,
          current_stage: litCase.current_stage,
          next_hearing_date: litCase.next_hearing_date,
          next_purpose: litCase.next_purpose,
        } : null,
        court: litCase?.court || null,
        bench: litCase?.bench || null,
        case_number: litCase?.case_number || null,
        cnr_number: litCase?.cnr_number || null,
        client_role: litCase?.client_role || null,
        next_hearing_date: litCase?.next_hearing_date || null,
        next_purpose: litCase?.next_purpose || null,
        current_stage: litCase?.current_stage || null,
        last_event: matterEvents[0] || null,
        events_count: matterEvents.length,
        stage_progress: calculateStageProgress(m.department, matterEvents, litCase),
      };
    });

    return res.status(200).json({
      success: true,
      client,
      matters: enrichedMatters,
      events: allEvents,
      billingStages,
      recoverableCosts,
      documents,
    });
  } catch (err) {
    console.error('Portal data API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
}
