export type OrderStatusUi = 'pending' | 'accepted' | 'rejected' | null;

/**
 * Extraction des champs « grille commandes » depuis le JSON Wintruck Connect (bloc Command / enveloppe).
 *
 * Correspondances principales (MVP) :
 * - Commande : CDETRP.numCde (+ BDEICD / ID_WT_Connect) + « / » + Taille_Conteneur + Type_Conteneur
 * - Rég. Douane : CDETRP.code_docdou
 * - Client : CDETRP.BDB8CD (code ; pas de raison sociale dans le JSON standard)
 * - Ref. client : RELCLI.1.DCE9CD ou BDEICD
 * - Départ / Retour : RELCLI / RELTRP (DCRLTX, DCRMTX, DDRNTX, DDROTX) ou BDGOTX
 * - Sens (type voyage) : CDETRP.BDCUST (I/E) + mention aller-retour si plusieurs segments RELCLI
 * - Taille / type conteneur : CDETRP.Taille_Conteneur, Type_Conteneur ; Armt : CDETRP.Armement
 * - Conteneur : CONTAINE.AREICD (sinon AREHCD)
 * - Booking : CDETRP.Booking
 * - C.A. : somme FRAISCLI.*.BZTTNB
 * - ACHAT : somme des lignes FRTRANSP (DFL7 puis DFL8 puis DFL6 par ligne)
 * - Date op. : CDETRP.cde_date_trsp → sinon RELTRP.rel_dat_trsp → Date_de_creation (formats yyyymmdd)
 * - Heure : CDETRP.EJV3TX ou Temps_ope
 * - Trsp / code TRSP / transitaire : CDETRP.BDD0CD ; Chauffeur : FRTRANSP.1.code_chauffeur ou BDD1CD
 * - Nb KM : RELTRP.1.DDTPNB (si entier > 0)
 * - Poids : CDETRP.BDEUNB (si > 0)
 * - Imco : IMPORT.code_onu ou imCO1
 * - Statut message : erreurs JSON → mise en évidence conteneur côté UI
 */

export type CommandeDirection = 'received' | 'sent';

export type ConnectMessageLike = {
  id: string;
  created_at?: string;
  status: string;
  num_cde: string | null;
  payload_raw: unknown;
  payload_transformed?: unknown | null;
  errors?: unknown;
};

function nz(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? '1' : '';
  const s = String(v).trim();
  if (s === '0') return '';
  return s;
}

function firstBlock(mapOrArr: unknown, key = '1'): Record<string, unknown> | null {
  if (!mapOrArr || typeof mapOrArr !== 'object') return null;
  if (Array.isArray(mapOrArr)) {
    const idx = Math.max(0, parseInt(key, 10) - 1);
    const el = mapOrArr[idx];
    return el && typeof el === 'object' ? (el as Record<string, unknown>) : null;
  }
  const o = mapOrArr as Record<string, unknown>;
  const line = o[key] ?? o['1'];
  return line && typeof line === 'object' ? (line as Record<string, unknown>) : null;
}

/** yyyymmdd (nombre ou chaîne) → yyyy-mm-dd pour tri / formatage UI */
export function parseWintruckYmdToIso(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : parseInt(String(v).replace(/\D/g, ''), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const s = String(n).padStart(8, '0');
  if (s.length !== 8) return null;
  const y = s.slice(0, 4);
  const m = s.slice(4, 6);
  const d = s.slice(6, 8);
  const mi = parseInt(m, 10);
  const di = parseInt(d, 10);
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return null;
  return `${y}-${m}-${d}`;
}

function sumFraisCliCa(cmd: Record<string, unknown>): number {
  const f = cmd.FRAISCLI;
  if (!f || typeof f !== 'object') return 0;
  let sum = 0;
  for (const v of Object.values(f as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const n = (v as { BZTTNB?: unknown }).BZTTNB;
    const x = typeof n === 'number' ? n : parseFloat(String(n ?? '0'));
    if (Number.isFinite(x)) sum += x;
  }
  return sum;
}

function numLine(v: unknown): number {
  const x = typeof v === 'number' ? v : parseFloat(String(v ?? 'NaN'));
  return Number.isFinite(x) ? x : 0;
}

/** Somme des achats transport : par ligne FRTRANSP, retenir DFL7 puis DFL8 puis DFL6 (règle MVP). */
function sumFrTranspAchat(cmd: Record<string, unknown>): number {
  const f = cmd.FRTRANSP;
  if (!f || typeof f !== 'object') return 0;
  let sum = 0;
  for (const v of Object.values(f as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const line = v as { DFL7NB?: unknown; DFL8NB?: unknown; DFL6NB?: unknown };
    const a = numLine(line.DFL7NB);
    if (a > 0) {
      sum += a;
      continue;
    }
    const b = numLine(line.DFL8NB);
    if (b > 0) {
      sum += b;
      continue;
    }
    sum += numLine(line.DFL6NB);
  }
  return sum;
}

function hasBlockingErrors(errors: unknown): boolean {
  if (!Array.isArray(errors)) return false;
  return errors.length > 0;
}

function sensLabel(cust: string): string {
  const c = cust.toUpperCase();
  if (c === 'I') return 'Import';
  if (c === 'E') return 'Export';
  return '';
}

function relCliSegmentCount(cmd: Record<string, unknown>): number {
  const r = cmd.RELCLI;
  if (!r || typeof r !== 'object') return 0;
  if (Array.isArray(r)) return r.length;
  return Object.keys(r as object).filter((k) => /^\d+$/.test(k)).length;
}

/**
 * Reçus : préfère le JSON transformé (codes destinataires, docdou transcodifié) si présent.
 * Envoyés : JSON brut tel qu’émis (enveloppe ou plat).
 */
export function extractCommandAndEnvelope(
  msg: ConnectMessageLike,
  direction: CommandeDirection
): { cmd: Record<string, unknown>; envelope: Record<string, unknown> } {
  const raw = (msg.payload_raw ?? {}) as Record<string, unknown>;
  const tr = (msg.payload_transformed ?? null) as Record<string, unknown> | null;

  const rawHasCmd = raw && typeof raw === 'object' && raw.Command && typeof raw.Command === 'object';
  const trHasCmd = tr && typeof tr === 'object' && tr.Command && typeof tr.Command === 'object';

  if (direction === 'received') {
    if (trHasCmd) return { cmd: tr.Command as Record<string, unknown>, envelope: tr };
    if (rawHasCmd) return { cmd: raw.Command as Record<string, unknown>, envelope: raw };
    return { cmd: raw, envelope: raw };
  }

  if (rawHasCmd) return { cmd: raw.Command as Record<string, unknown>, envelope: raw };
  return { cmd: raw, envelope: raw };
}

function idWtConnect(envelope: Record<string, unknown>): string {
  const v = envelope?.ID_WT_Connect;
  const s = v !== null && v !== undefined ? String(v).trim() : '';
  if (!s || s === '0') return '';
  return s;
}

/** Colonne « Commande » : n° + taille & type ; segments vides omis (rien affiché si absent). */
export function buildCommandeLibelle(cmd: Record<string, unknown>, envelope: Record<string, unknown>): string {
  const c = (cmd.CDETRP ?? {}) as Record<string, unknown>;
  const num = nz(c.numCde) || nz(c.BDEICD) || idWtConnect(envelope);
  const taille = nz(c.Taille_Conteneur);
  const type = nz(c.Type_Conteneur);
  const tt = [taille, type].filter(Boolean).join(' ') || nz(c.tailleTypeEDI);
  if (num && tt) return `${num} / ${tt}`;
  if (num) return num;
  if (tt) return tt;
  return '';
}

export type MappedCommandeRow = {
  messageId: string;
  status: string;
  /** Statut métier Pending / Accepted / Rejected (connect_order_status) */
  orderStatus: OrderStatusUi | null;
  commande: string;
  /** Envelope.ID_WT_Connect (ex: WHEEL_367155) */
  idWtConnect: string;
  /** Horodatage d’envoi/réception du message (connect_messages.created_at) */
  messageCreatedAt: string;
  dateOp: string;
  heure: string;
  /** Libellé annuaire (connect_client_directory) ou code si inconnu */
  client: string;
  /** CDETRP.BDB8CD */
  codeClient: string;
  refClient: string;
  depart: string;
  retour: string;
  /** Import / Export / aller-retour (BDCUST + segments RELCLI) */
  typeVoyage: string;
  armt: string;
  /** CDETRP.Taille_Conteneur */
  taille: string;
  /** CDETRP.Type_Conteneur */
  typeConteneur: string;
  terminal: string;
  conteneur: string;
  conteneurAlert: boolean;
  adresse: string;
  /** CDETRP.Booking uniquement */
  booking: string;
  rstEnlvt: string;
  cdeTransferee: boolean;
  ca: number;
  achat: number;
  port: string;
  regDouane: string;
  nbKm: number | null;
  /** Libellé annuaire transporteur ou code */
  trsp: string;
  /** CDETRP.BDD0CD */
  codeTrsp: string;
  chauffeur: string;
  chassis: string;
  numCmr: string;
  dateCmr: string;
  transitaire: string;
  facture: string;
  imco: number | null;
  poids: number | null;
  clotureEta: string;
  plomb: string;
  numAcquis: string;
  numCiterne: string;
  etabl: string;
  zoneDep1ere: string;
  zone: string;
  dateProforma: string;
  userProforma: string;
  dateCreation: string;
  creePar: string;
};

export function mapConnectMessageToCommandeRow(msg: ConnectMessageLike, direction: CommandeDirection): MappedCommandeRow {
  const { cmd, envelope } = extractCommandAndEnvelope(msg, direction);
  const c = (cmd.CDETRP ?? {}) as Record<string, unknown>;
  const containe = (cmd.CONTAINE ?? {}) as Record<string, unknown>;
  const imp = (cmd.IMPORT ?? {}) as Record<string, unknown>;
  const rel1 = firstBlock(cmd.RELCLI, '1');
  const rel2 = firstBlock(cmd.RELCLI, '2');
  const trp1 = firstBlock(cmd.RELTRP, '1');
  const fr1 = firstBlock(cmd.FRTRANSP, '1');

  const cust = nz(c.BDCUST);
  let typeVoyage = sensLabel(cust);
  if (relCliSegmentCount(cmd) >= 2 && typeVoyage) {
    typeVoyage = `${typeVoyage} (aller-retour)`;
  }

  const dateOp =
    parseWintruckYmdToIso(c.cde_date_trsp) ||
    parseWintruckYmdToIso(trp1?.rel_dat_trsp) ||
    parseWintruckYmdToIso(c.Date_de_creation) ||
    '';

  const heure = nz(c.EJV3TX) || nz(c.Temps_ope);

  const depart = nz(rel1?.DCRLTX) || nz(trp1?.DDRNTX) || nz(c.BDGOTX);
  const retour = nz(rel1?.DCRMTX) || nz(trp1?.DDROTX) || nz(rel2?.DCRLTX);

  const conteneur = nz(containe.AREICD) || nz(containe.AREHCD) || nz(c.BDEICD);
  const booking = nz(c.Booking);
  const rst = nz(rel1?.DCJ0ST) || nz(trp1?.DDJ1ST);

  const nbKmRaw = trp1?.DDTPNB;
  const nbKm = typeof nbKmRaw === 'number' && Number.isFinite(nbKmRaw) ? nbKmRaw : parseInt(String(nbKmRaw ?? ''), 10);
  const nbKmOk = Number.isFinite(nbKm) && nbKm > 0 ? nbKm : null;

  const poidsRaw = c.BDEUNB;
  const poidsNum = typeof poidsRaw === 'number' ? poidsRaw : parseFloat(String(poidsRaw ?? ''));
  const poids = Number.isFinite(poidsNum) && poidsNum > 0 ? poidsNum : null;

  const imcoRaw = imp.code_onu ?? imp['imCO1'];
  const imcoNum = typeof imcoRaw === 'number' ? imcoRaw : parseInt(String(imcoRaw ?? ''), 10);
  const imco = Number.isFinite(imcoNum) && imcoRaw !== '' ? imcoNum : null;

  const dateCmrIso = parseWintruckYmdToIso(c.DATE_cmr);
  const clotureIso = parseWintruckYmdToIso(imp.ETA);

  const errs = hasBlockingErrors(msg.errors) || /ERROR/i.test(String(msg.status ?? ''));

  return {
    messageId: msg.id,
    status: nz(msg.status),
    commande: buildCommandeLibelle(cmd, envelope),
    idWtConnect: idWtConnect(envelope),
    messageCreatedAt: String(msg.created_at ?? ''),
    dateOp,
    heure,
    client: nz(c.BDB8CD),
    codeClient: nz(c.BDB8CD),
    refClient: nz(rel1?.DCE9CD) || nz(c.BDEICD),
    depart,
    retour,
    typeVoyage,
    armt: nz(c.Armement),
    taille: nz(c.Taille_Conteneur),
    typeConteneur: nz(c.Type_Conteneur),
    terminal: nz(c.Terminal),
    conteneur,
    conteneurAlert: errs,
    adresse: nz(rel1?.lieu_arrv) || nz(rel1?.Insee_arr) || nz(c.lieu_1),
    booking,
    rstEnlvt: rst,
    cdeTransferee: Boolean(c['cde_confirmé'] ?? c['cde_confirme']),
    ca: sumFraisCliCa(cmd),
    achat: sumFrTranspAchat(cmd),
    port: nz(c.REFPOR) || nz(c.BDETCD),
    regDouane: nz(c.code_docdou),
    nbKm: nbKmOk,
    trsp: nz(c.BDD0CD),
    codeTrsp: nz(c.BDD0CD),
    chauffeur: nz(fr1?.code_chauffeur) || nz(c.BDD1CD),
    chassis: nz(trp1?.DDD1CD),
    numCmr: nz(c.Numcmr),
    dateCmr: dateCmrIso || '',
    transitaire: nz(c.BDD0CD),
    facture: nz(c.Type_facture),
    imco,
    poids,
    clotureEta: clotureIso || '',
    plomb: nz(containe.ARBWST),
    numAcquis: nz(c.Num_acquis),
    numCiterne: nz(c.Num_citerne),
    etabl: nz(c.BDA5CD),
    zoneDep1ere: nz(c.zondep),
    zone: nz(c.BDQECD),
    dateProforma: parseWintruckYmdToIso(c.Proforma_date) || '',
    userProforma: nz(c.Proforma_user),
    dateCreation: parseWintruckYmdToIso(c.Date_de_creation) || '',
    creePar: nz(c.user_creation),
    orderStatus: null,
  };
}
