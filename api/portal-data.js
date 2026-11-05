// api/portal-data.js
// Vercel Serverless Function: returns the signed-in client's matters, grouped by billing entity.
//
// Security model:
//   * The caller MUST send a Supabase access token (Authorization: Bearer <jwt>).
//   * The client id is taken ONLY from app_metadata.client_id on the verified token.
//     app_metadata can be written only with the service role, unlike user_metadata,
//     which any signed-in user can change with supabase.auth.updateUser().
//   * Query-string / header client ids are ignored.
//   * Every query is additionally constrained to that client id (defence in depth).
import { createClient } from '@supabase/supabase-js';

const CENTRAL_SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_CENTRAL_SUPABASE_URL ||
  'https://eafciegebhuhoneypsqy.supabase.co';

const CENTRAL_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZmNpZWdlYmh1aG9uZXlwc3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA5NTU1NywiZXhwIjoyMTA2NjcxNTU3fQ.rxJJ-BO6bAeJYBu-tonvwxNZ3rh1D5ugjIpQMPk4qNo';

const admin =
  CENTRAL_SUPABASE_URL && CENTRAL_SERVICE_KEY
    ? createClient(CENTRAL_SUPABASE_URL, CENTRAL_SERVICE_KEY, { auth: { persistSession: false } })
    : null;

const ALLOWED_ORIGINS = (process.env.PORTAL_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Cost rows a client should see on their statement.
const CLIENT_VISIBLE_COST_STATUSES = ['PENDING_FINANCE', 'AUTO_POSTED'];

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
    'Registered',
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
  const stageList = PROSECUTION_STAGES[department] || PROSECUTION_STAGES.LITIGATION;
  const totalStages = stageList.length;
  const pct = (i) => Math.round(((i + 1) / totalStages) * 100);

  if (department === 'LITIGATION' && litCase?.current_stage) {
    const cs = String(litCase.current_stage).toLowerCase();
    let i = 0;
    if (/decree|order|disposed|judgment/.test(cs)) i = 4;
    else if (/argument|evidence|hearing|trial/.test(cs)) i = 3;
    else if (/pleading|objection|reply|rejoinder|\bws\b/.test(cs)) i = 2;
    else if (/summons|notice|admission/.test(cs)) i = 1;
    return { currentStage: litCase.current_stage, stageIndex: i, totalStages, percentage: pct(i) };
  }

  if (!events.length) {
    return { currentStage: stageList[0], stageIndex: 0, totalStages, percentage: pct(0) };
  }

  const codes = events.map((e) => String(e.event_code || '').toUpperCase());
  const has = (re) => codes.some((c) => re.test(c));
  let i = 0;
  if (department === 'IP_PATENT') {
    if (has(/GRANT/)) i = 5;
    else if (has(/HEARING|_WS_/)) i = 4;
    else if (has(/FER/)) i = 3;
    else if (has(/RFE/)) i = 2;
    else if (has(/CS_FILED/)) i = 1;
  } else if (department === 'IP_SOFT') {
    if (has(/REGISTERED|GRANT/)) i = 4;
    else if (has(/PUBLISHED|JOURNAL/)) i = 3;
    else if (has(/REPLY|COUNTER/)) i = 2;
    else if (has(/FORMALITY|EXAM_REPORT/)) i = 1;
  } else if (department === 'LITIGATION') {
    if (has(/JUDGMENT|DECREE|SETTLED/)) i = 4;
    else if (has(/ARGUMENT|EVIDENCE/)) i = 3;
    else if (has(/WRITTEN_STATEMENT|IA_/)) i = 2;
    else if (has(/SUIT_FILED|NOTICE/)) i = 1;
  } else if (department === 'AGREEMENT') {
    if (has(/AGR_STAMPED/)) i = 4;
    else if (has(/AGR_EXECUTED|AGR_FINALIZED/)) i = 3;
    else if (has(/AGR_COUNTERPARTY|AGR_CLIENT_APPROVED/)) i = 2;
    else if (has(/AGR_V1_SENT/)) i = 1;
  } else {
    i = Math.min(events.length - 1, totalStages - 1);
  }
  return { currentStage: stageList[i], stageIndex: i, totalStages, percentage: pct(i) };
}

function applyCors(req, res) {
  const origin = req.headers?.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  res.setHeader('Cache-Control', 'private, no-store');
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  if (!admin) {
    console.error('portal-data: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured');
    return res.status(500).json({ error: 'Portal is not configured.' });
  }

  // 1. Authenticate. No token, no data.
  const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Sign in required.' });

  const { data: authData, error: authErr } = await admin.auth.getUser(token);
  const user = authData?.user;
  if (authErr || !user) return res.status(401).json({ error: 'Session expired. Please sign in again.' });

  const appMeta = user.app_metadata || {};
  const userMeta = user.user_metadata || {};
  const clientId = appMeta.client_id || userMeta.client_id;
  const role = appMeta.role || userMeta.role;
  if (role !== 'CLIENT' || !clientId) {
    return res.status(403).json({ error: 'This account is not linked to a client portfolio.' });
  }

  const warnings = [];
  const soft = async (label, promise) => {
    const { data, error } = await promise;
    if (error) {
      console.error(`portal-data: ${label} failed for client ${clientId}:`, error.message);
      warnings.push(label);
      return [];
    }
    return data || [];
  };

  try {
    // 2. Client profile + the firm entities that bill this portal.
    const [{ data: client, error: clientErr }, { data: entities, error: entErr }] = await Promise.all([
      admin
        .schema('core')
        .from('clients')
        .select('id, client_code, client_name, entity_type, email, phone, gstin, pan, billing_address, state_code')
        .eq('id', clientId)
        .maybeSingle(),
      admin
        .schema('core')
        .from('legal_entities')
        .select('code, display_name, practice_areas, sort_order, gstin, bank_account_name, bank_name, bank_account_no, bank_ifsc, bank_branch')
        .eq('active', true)
        .order('sort_order'),
    ]);
    if (clientErr) throw clientErr;
    if (entErr) throw entErr;
    if (!client) return res.status(404).json({ error: 'Client record not found.' });

    // 3. Matters. billing_entity is a DB column (set by trigger from department_entity_map),
    //    so the UI groups on data, not on a hardcoded department list.
    const { data: projectCodes, error: pcErr } = await admin
      .schema('core')
      .from('project_codes')
      .select('id, code, prefix, department, billing_entity, client_id, title, status, owning_app, created_at')
      .eq('client_id', clientId)
      .neq('status', 'DUPLICATE_REVIEW')
      .order('created_at', { ascending: false });
    if (pcErr) throw pcErr;

    const matters = projectCodes || [];
    const matterIds = matters.map((m) => m.id);
    const empty = Promise.resolve({ data: [], error: null });

    // 4. Related rows, all constrained to this client's matter ids.
    const [litCases, events, billingStages, recoverableCosts, documents] = await Promise.all([
      soft(
        'litigation cases',
        matterIds.length
          ? admin
              .schema('litigator')
              .from('cases')
              .select('project_code_id, court, bench, case_number, cnr_number, case_type, client_role, current_stage, next_hearing_date, next_purpose')
              .in('project_code_id', matterIds)
          : empty
      ),
      soft(
        'matter events',
        matterIds.length
          ? admin
              .schema('core')
              .from('matter_events')
              .select('id, project_code_id, event_code, title, detail, occurred_at, source_app, client_visible, client_label, created_at')
              .in('project_code_id', matterIds)
              .eq('client_visible', true)
              .order('occurred_at', { ascending: false })
          : empty
      ),
      soft(
        'billing stages',
        matterIds.length
          ? admin
              .schema('finance')
              .from('billing_stages')
              // Real column names from 0300_finance.sql, aliased to the portal's shape.
              // The previous query read stage_name/amount/status, which do not exist,
              // so every billing figure in the portal rendered as blank / ₹0.
              .select(
                'id, project_code_id, stage_name:name, trigger_event:trigger_event_code, amount:allocated_amount, ' +
                  'status:billing_status, is_completed, triggered_at:completed_at, created_at, quotations!inner(status)'
              )
              .in('project_code_id', matterIds)
              // Only stages of the live quotation; superseded/cancelled versions would double-count.
              .eq('quotations.status', 'CONFIRMED')
              .order('created_at', { ascending: false })
          : empty
      ),
      soft(
        'recoverable costs',
        matterIds.length
          ? admin
              .schema('core')
              .from('recoverable_costs')
              .select('id, project_code_id, source_app, source_type, category, description, amount, cost_date, posting_status')
              .eq('client_id', clientId)
              .in('project_code_id', matterIds)
              .in('posting_status', CLIENT_VISIBLE_COST_STATUSES)
              .order('cost_date', { ascending: false })
          : empty
      ),
      // Only documents attached to one of THIS client's matters. Office-level
      // documents (project_code_id IS NULL) belong to no client and are never returned.
      soft(
        'documents',
        matterIds.length
          ? admin
              .schema('core')
              .from('documents')
              .select('id, project_code_id, category, file_name, mime_type, size_bytes, zoho_permalink, workdrive_path, client_shared, source_app, uploaded_at')
              .in('project_code_id', matterIds)
              .eq('client_shared', true)
              .eq('finance_only', false)
              .order('uploaded_at', { ascending: false })
          : empty
      ),
    ]);

    const litByMatter = new Map(litCases.map((lc) => [lc.project_code_id, lc]));
    const eventsByMatter = new Map();
    for (const ev of events) {
      if (!eventsByMatter.has(ev.project_code_id)) eventsByMatter.set(ev.project_code_id, []);
      eventsByMatter.get(ev.project_code_id).push(ev);
    }
    const matterById = new Map(matters.map((m) => [m.id, m]));

    const enrichedMatters = matters.map((m) => {
      const matterEvents = eventsByMatter.get(m.id) || [];
      const lc = litByMatter.get(m.id) || null;
      return {
        ...m,
        court: lc?.court ?? null,
        bench: lc?.bench ?? null,
        case_number: lc?.case_number ?? null,
        cnr_number: lc?.cnr_number ?? null,
        client_role: lc?.client_role ?? null,
        next_hearing_date: lc?.next_hearing_date ?? null,
        next_purpose: lc?.next_purpose ?? null,
        current_stage: lc?.current_stage ?? null,
        last_event: matterEvents[0] || null,
        events_count: matterEvents.length,
        stage_progress: calculateStageProgress(m.department, matterEvents, lc),
      };
    });

    // Stamp billing_entity onto child rows so every tab and ledger total can
    // be split per entity without the browser re-deriving it.
    const withEntity = (row) => ({ ...row, billing_entity: matterById.get(row.project_code_id)?.billing_entity ?? null });

    return res.status(200).json({
      success: true,
      client,
      entities: entities || [],
      matters: enrichedMatters,
      events: events.map((ev) => {
        const m = matterById.get(ev.project_code_id);
        return { ...withEntity(ev), project_code: m?.code ?? null, matter_title: m?.title ?? null };
      }),
      billingStages: billingStages.map(({ quotations, ...s }) => ({ ...withEntity(s), currency: 'INR' })),
      recoverableCosts: recoverableCosts.map(withEntity),
      documents: documents.map((d) => ({ ...withEntity(d), project_code: matterById.get(d.project_code_id)?.code ?? null })),
      warnings,
    });
  } catch (err) {
    console.error('portal-data: fatal error for client', clientId, err);
    return res.status(500).json({ error: 'Could not load your portfolio. Please try again shortly.' });
  }
}
